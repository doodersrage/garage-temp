import { createServerClient } from "./supabase";
import { fetchLatestSensorValues } from "./sensorReadings";
import { WEATHER_CITY_PRESETS } from "./weatherCities";

export type FreezeMapSnapshot = {
  city_id: string;
  city_label: string;
  sample_count: number;
  avg_temp_f: number | null;
  min_temp_f: number | null;
  freeze_risk_count: number;
  captured_at: string;
};

function cityLabel(cityId: string): string {
  const match = WEATHER_CITY_PRESETS.find((c) => c.id === cityId);
  return match?.label ?? `City ${cityId}`;
}

export async function updateHouseholdFreezeMapSettings(
  householdId: string,
  optIn: boolean,
  cityId: string | null,
): Promise<{ error: string | null }> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("households")
    .update({
      freeze_map_opt_in: optIn,
      freeze_map_city_id: cityId && /^\d+$/.test(cityId) ? cityId : null,
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
    .select("id, freeze_map_city_id")
    .eq("freeze_map_opt_in", true)
    .not("freeze_map_city_id", "is", null);

  if (error) {
    return { cities: 0, error: error.message };
  }

  type Acc = {
    city_id: string;
    temps: number[];
    freeze_risk_count: number;
  };
  const byCity = new Map<string, Acc>();

  for (const household of households ?? []) {
    const cityId = household.freeze_map_city_id;
    if (!cityId) continue;
    const latest = await fetchLatestSensorValues(household.id);
    const temps = latest
      .filter((r) => r.sensor.kind === "temperature" && r.value_num != null)
      .map((r) => r.value_num as number);
    if (temps.length === 0) continue;

    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
    const min = Math.min(...temps);
    const entry = byCity.get(cityId) ?? {
      city_id: cityId,
      temps: [],
      freeze_risk_count: 0,
    };
    entry.temps.push(avg);
    if (min <= 34) entry.freeze_risk_count += 1;
    byCity.set(cityId, entry);
  }

  const capturedAt = new Date().toISOString();
  const rows = [...byCity.values()].map((entry) => {
    const avg =
      entry.temps.reduce((a, b) => a + b, 0) / Math.max(entry.temps.length, 1);
    return {
      city_id: entry.city_id,
      city_label: cityLabel(entry.city_id),
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

/** Latest snapshot per city (most recent capture batch preferred). */
export async function listLatestFreezeMapSnapshots(): Promise<FreezeMapSnapshot[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("freeze_map_snapshots")
    .select(
      "city_id, city_label, sample_count, avg_temp_f, min_temp_f, freeze_risk_count, captured_at",
    )
    .order("captured_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];

  const latestCapture = data[0]?.captured_at;
  const batch = latestCapture
    ? data.filter((row) => row.captured_at === latestCapture)
    : data;

  return [...batch].sort(
    (a, b) => (a.avg_temp_f ?? 999) - (b.avg_temp_f ?? 999),
  ) as FreezeMapSnapshot[];
}
