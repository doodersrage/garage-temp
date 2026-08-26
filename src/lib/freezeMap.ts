import { createServerClient } from "./supabase";
import { fetchLatestSensorValues } from "./sensorReadings";
import {
  freezeMapAggregateKey,
  getWeatherPresetLabel,
  uniqueWeatherCityPresets,
} from "./weatherCities";
import { getWeatherPresetCoords } from "./weatherCityCoords";

export type FreezeMapSnapshot = {
  city_id: string;
  city_label: string;
  sample_count: number;
  avg_temp_f: number | null;
  min_temp_f: number | null;
  freeze_risk_count: number;
  captured_at: string;
  lat: number | null;
  lon: number | null;
};

export type FreezeMapHouseholdSettings = {
  optIn: boolean;
  cityId: string | null;
  lat: number | null;
  lon: number | null;
  label: string | null;
};

function cityLabelFromId(cityId: string): string {
  return getWeatherPresetLabel(cityId) ?? `City ${cityId}`;
}

export async function updateHouseholdFreezeMapSettings(
  householdId: string,
  settings: FreezeMapHouseholdSettings,
): Promise<{ error: string | null }> {
  const supabase = createServerClient();
  const cityId =
    settings.cityId && /^\d+$/.test(settings.cityId) ? settings.cityId : null;
  const { error } = await supabase
    .from("households")
    .update({
      freeze_map_opt_in: settings.optIn,
      freeze_map_city_id: cityId,
      freeze_map_lat: settings.lat,
      freeze_map_lon: settings.lon,
      freeze_map_label: settings.label?.trim() || null,
    })
    .eq("id", householdId);
  return { error: error?.message ?? null };
}

export async function collectFreezeMapSnapshots(): Promise<{
  cities: number;
  error: string | null;
}> {
  const supabase = createServerClient();
  const { data: households, error } = await supabase
    .from("households")
    .select(
      "id, freeze_map_city_id, freeze_map_lat, freeze_map_lon, freeze_map_label",
    )
    .eq("freeze_map_opt_in", true);

  if (error) {
    return { cities: 0, error: error.message };
  }

  type Acc = {
    city_id: string;
    city_label: string;
    lat: number | null;
    lon: number | null;
    temps: number[];
    freeze_risk_count: number;
  };
  const byCity = new Map<string, Acc>();

  for (const household of households ?? []) {
    const key = freezeMapAggregateKey({
      cityId: household.freeze_map_city_id,
      lat: household.freeze_map_lat,
      lon: household.freeze_map_lon,
    });
    if (!key) continue;

    const lat =
      household.freeze_map_lat ??
      parseGeoKeyLat(key) ??
      getWeatherPresetCoords(household.freeze_map_city_id)?.lat ??
      null;
    const lon =
      household.freeze_map_lon ??
      parseGeoKeyLon(key) ??
      getWeatherPresetCoords(household.freeze_map_city_id)?.lon ??
      null;

    const latest = await fetchLatestSensorValues(household.id);
    const temps = latest
      .filter((r) => r.sensor.kind === "temperature" && r.value_num != null)
      .map((r) => r.value_num as number);
    if (temps.length === 0) continue;

    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
    const min = Math.min(...temps);
    const label =
      household.freeze_map_label?.trim() ||
      (household.freeze_map_city_id
        ? cityLabelFromId(household.freeze_map_city_id)
        : key);
    const entry = byCity.get(key) ?? {
      city_id: key,
      city_label: label,
      lat,
      lon,
      temps: [],
      freeze_risk_count: 0,
    };
    if (lat != null && entry.lat == null) entry.lat = lat;
    if (lon != null && entry.lon == null) entry.lon = lon;
    entry.temps.push(avg);
    if (min <= 34) entry.freeze_risk_count += 1;
    byCity.set(key, entry);
  }

  const capturedAt = new Date().toISOString();
  const rows = [...byCity.values()].map((entry) => {
    const avg =
      entry.temps.reduce((a, b) => a + b, 0) / Math.max(entry.temps.length, 1);
    return {
      city_id: entry.city_id,
      city_label: entry.city_label,
      lat: entry.lat,
      lon: entry.lon,
      sample_count: entry.temps.length,
      avg_temp_f: avg,
      min_temp_f: Math.min(...entry.temps),
      freeze_risk_count: entry.freeze_risk_count,
      captured_at: capturedAt,
    };
  });

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("freeze_map_snapshots")
      .insert(rows);
    if (insertError) {
      return { cities: 0, error: insertError.message };
    }
  }

  return { cities: rows.length, error: null };
}

export async function listLatestFreezeMapSnapshots(): Promise<FreezeMapSnapshot[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("freeze_map_snapshots")
    .select(
      "city_id, city_label, sample_count, avg_temp_f, min_temp_f, freeze_risk_count, captured_at, lat, lon",
    )
    .order("captured_at", { ascending: false })
    .limit(400);

  if (error || !data) return [];

  const latestCapture = data[0]?.captured_at;
  const batch = latestCapture
    ? data.filter((row) => row.captured_at === latestCapture)
    : data;

  return [...batch].sort(
    (a, b) => (a.avg_temp_f ?? 999) - (b.avg_temp_f ?? 999),
  ) as FreezeMapSnapshot[];
}

/** Last N avg temps per city for sparklines (oldest → newest). */
export async function listFreezeMapSparklines(
  limitPoints = 7,
): Promise<Map<string, number[]>> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("freeze_map_snapshots")
    .select("city_id, avg_temp_f, captured_at")
    .order("captured_at", { ascending: false })
    .limit(800);

  const map = new Map<string, number[]>();
  if (error || !data) return map;

  for (const row of data) {
    if (row.avg_temp_f == null) continue;
    const list = map.get(row.city_id) ?? [];
    if (list.length >= limitPoints) continue;
    list.push(row.avg_temp_f);
    map.set(row.city_id, list);
  }

  for (const [key, values] of map) {
    map.set(key, [...values].reverse());
  }
  return map;
}

export { uniqueWeatherCityPresets };

function parseGeoKeyLat(key: string): number | null {
  const match = /^geo:([-\d.]+),/.exec(key);
  if (!match) return null;
  const lat = Number(match[1]);
  return Number.isFinite(lat) ? lat : null;
}

function parseGeoKeyLon(key: string): number | null {
  const match = /^geo:[-\d.]+,([-\d.]+)$/.exec(key);
  if (!match) return null;
  const lon = Number(match[1]);
  return Number.isFinite(lon) ? lon : null;
}
