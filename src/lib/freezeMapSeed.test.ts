import { describe, expect, it } from "vitest";
import {
  buildFreezeMapSeedSnapshots,
  FREEZE_MAP_SAMPLE_FLOOR,
  resolveFreezeMapDisplay,
} from "./freezeMapSeed";
import type { FreezeMapSnapshot } from "./freezeMap";

describe("freezeMapSeed", () => {
  it("builds seed cities that all meet the sample floor and have coordinates", () => {
    const seeds = buildFreezeMapSeedSnapshots("2026-01-15T12:00:00.000Z");
    expect(seeds.length).toBeGreaterThanOrEqual(8);
    for (const row of seeds) {
      expect(row.sample_count).toBeGreaterThanOrEqual(FREEZE_MAP_SAMPLE_FLOOR);
      expect(row.lat).not.toBeNull();
      expect(row.lon).not.toBeNull();
      expect(row.isSeed).toBe(true);
    }
  });

  it("keeps live data when at least one city meets the floor", () => {
    const live: FreezeMapSnapshot[] = [
      {
        city_id: "5128581",
        city_label: "New York, NY",
        sample_count: 4,
        avg_temp_f: 40,
        min_temp_f: 36,
        freeze_risk_count: 0,
        captured_at: "2026-08-30T12:00:00.000Z",
        lat: 40.7,
        lon: -74,
      },
      {
        city_id: "4164138",
        city_label: "Miami, FL",
        sample_count: 1,
        avg_temp_f: 72,
        min_temp_f: 70,
        freeze_risk_count: 0,
        captured_at: "2026-08-30T12:00:00.000Z",
        lat: 25.7,
        lon: -80.2,
      },
    ];
    const sparks = new Map([["5128581", [39, 40]]]);
    const resolved = resolveFreezeMapDisplay(live, sparks);
    expect(resolved.isSeed).toBe(false);
    expect(resolved.snapshots).toBe(live);
    expect(resolved.sparklines).toBe(sparks);
  });

  it("falls back to seed when nothing meets the floor", () => {
    const sparse: FreezeMapSnapshot[] = [
      {
        city_id: "5128581",
        city_label: "New York, NY",
        sample_count: 1,
        avg_temp_f: 40,
        min_temp_f: 36,
        freeze_risk_count: 0,
        captured_at: "2026-08-30T12:00:00.000Z",
        lat: 40.7,
        lon: -74,
      },
    ];
    const resolved = resolveFreezeMapDisplay(sparse, new Map());
    expect(resolved.isSeed).toBe(true);
    expect(resolved.snapshots.every((row) => row.isSeed)).toBe(true);
    expect(resolved.snapshots.some((row) => row.sample_count >= 3)).toBe(true);
  });
});
