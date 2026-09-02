import type { FreezeMapSnapshot } from "./freezeMap";
import { getWeatherPresetCoords } from "./weatherCityCoords";
import { getWeatherPresetLabel } from "./weatherCities";

/** Cities below this sample count are hidden unless `?sparse=1`. */
export const FREEZE_MAP_SAMPLE_FLOOR = 3;

type SeedCity = {
  cityId: string;
  sample_count: number;
  avg_temp_f: number;
  min_temp_f: number;
  freeze_risk_count: number;
  /** Oldest → newest avg °F for the sparkline. */
  sparkline: number[];
};

/**
 * Illustrative late-winter garage aggregates so the public map isn’t empty
 * before enough households opt in. Not live community data.
 */
const SEED_CITIES: SeedCity[] = [
  {
    cityId: "5879400",
    sample_count: 8,
    avg_temp_f: 28.4,
    min_temp_f: 22.1,
    freeze_risk_count: 7,
    sparkline: [31.2, 30.1, 29.4, 28.8, 28.1, 27.9, 28.4],
  },
  {
    cityId: "4887398",
    sample_count: 11,
    avg_temp_f: 33.6,
    min_temp_f: 29.8,
    freeze_risk_count: 6,
    sparkline: [36.1, 35.4, 34.8, 34.2, 33.9, 33.5, 33.6],
  },
  {
    cityId: "4990729",
    sample_count: 7,
    avg_temp_f: 34.2,
    min_temp_f: 30.5,
    freeze_risk_count: 4,
    sparkline: [37.0, 36.2, 35.5, 34.9, 34.4, 34.1, 34.2],
  },
  {
    cityId: "4930956",
    sample_count: 9,
    avg_temp_f: 36.8,
    min_temp_f: 32.4,
    freeze_risk_count: 3,
    sparkline: [39.2, 38.5, 37.9, 37.4, 37.0, 36.7, 36.8],
  },
  {
    cityId: "5128581",
    sample_count: 14,
    avg_temp_f: 39.1,
    min_temp_f: 34.6,
    freeze_risk_count: 2,
    sparkline: [41.5, 40.8, 40.2, 39.7, 39.3, 39.0, 39.1],
  },
  {
    cityId: "5419384",
    sample_count: 6,
    avg_temp_f: 37.5,
    min_temp_f: 31.9,
    freeze_risk_count: 3,
    sparkline: [40.1, 39.4, 38.6, 38.0, 37.6, 37.4, 37.5],
  },
  {
    cityId: "5809844",
    sample_count: 10,
    avg_temp_f: 41.2,
    min_temp_f: 36.8,
    freeze_risk_count: 1,
    sparkline: [43.0, 42.5, 42.0, 41.6, 41.3, 41.1, 41.2],
  },
  {
    cityId: "5746545",
    sample_count: 8,
    avg_temp_f: 42.0,
    min_temp_f: 37.4,
    freeze_risk_count: 1,
    sparkline: [44.2, 43.6, 43.0, 42.5, 42.2, 41.9, 42.0],
  },
  {
    cityId: "4460243",
    sample_count: 5,
    avg_temp_f: 44.8,
    min_temp_f: 39.2,
    freeze_risk_count: 0,
    sparkline: [46.5, 46.0, 45.5, 45.1, 44.9, 44.7, 44.8],
  },
  {
    cityId: "4644585",
    sample_count: 6,
    avg_temp_f: 45.6,
    min_temp_f: 40.1,
    freeze_risk_count: 0,
    sparkline: [47.8, 47.1, 46.5, 46.0, 45.7, 45.5, 45.6],
  },
  {
    cityId: "5308655",
    sample_count: 9,
    avg_temp_f: 58.3,
    min_temp_f: 52.0,
    freeze_risk_count: 0,
    sparkline: [59.5, 59.1, 58.8, 58.5, 58.4, 58.2, 58.3],
  },
  {
    cityId: "4164138",
    sample_count: 7,
    avg_temp_f: 68.4,
    min_temp_f: 64.1,
    freeze_risk_count: 0,
    sparkline: [69.2, 69.0, 68.7, 68.5, 68.4, 68.3, 68.4],
  },
];

export function buildFreezeMapSeedSnapshots(
  capturedAt = new Date().toISOString(),
): FreezeMapSnapshot[] {
  const rows: FreezeMapSnapshot[] = [];
  for (const seed of SEED_CITIES) {
    const coords = getWeatherPresetCoords(seed.cityId);
    if (!coords) continue;
    rows.push({
      city_id: seed.cityId,
      city_label: getWeatherPresetLabel(seed.cityId) ?? `City ${seed.cityId}`,
      sample_count: seed.sample_count,
      avg_temp_f: seed.avg_temp_f,
      min_temp_f: seed.min_temp_f,
      freeze_risk_count: seed.freeze_risk_count,
      captured_at: capturedAt,
      lat: coords.lat,
      lon: coords.lon,
      isSeed: true,
    });
  }
  return rows.sort((a, b) => (a.avg_temp_f ?? 999) - (b.avg_temp_f ?? 999));
}

export function buildFreezeMapSeedSparklines(): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const seed of SEED_CITIES) {
    map.set(seed.cityId, [...seed.sparkline]);
  }
  return map;
}

/**
 * Prefer live opt-in cities that meet the sample floor; otherwise show seed preview.
 * Live snapshots below the floor are still returned via `approaching` for momentum UI.
 */
export function resolveFreezeMapDisplay(
  snapshots: FreezeMapSnapshot[],
  sparklines: Map<string, number[]>,
  sampleFloor = FREEZE_MAP_SAMPLE_FLOOR,
): {
  snapshots: FreezeMapSnapshot[];
  sparklines: Map<string, number[]>;
  isSeed: boolean;
  approaching: FreezeMapSnapshot[];
} {
  const approaching = [...snapshots]
    .filter((row) => row.sample_count > 0 && row.sample_count < sampleFloor)
    .sort(
      (a, b) =>
        b.sample_count - a.sample_count ||
        a.city_label.localeCompare(b.city_label),
    );

  const qualifying = snapshots.filter((row) => row.sample_count >= sampleFloor);
  if (qualifying.length > 0) {
    return { snapshots, sparklines, isSeed: false, approaching };
  }
  return {
    snapshots: buildFreezeMapSeedSnapshots(),
    sparklines: buildFreezeMapSeedSparklines(),
    isSeed: true,
    approaching,
  };
}
