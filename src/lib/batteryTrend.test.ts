import { describe, expect, it } from "vitest";
import {
  appendBatterySample,
  detectBatteryTrendDrop,
  estimateBatteryDaysRemaining,
} from "./batteryTrend";

describe("battery trend", () => {
  it("appends samples with cap", () => {
    let history: unknown = [];
    for (let i = 0; i < 20; i += 1) {
      history = appendBatterySample(history, 100 - i, `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`);
    }
    expect((history as []).length).toBeLessThanOrEqual(14);
  });

  it("detects large drop", () => {
    const msg = detectBatteryTrendDrop([
      { pct: 90, at: new Date(Date.now() - 5 * 86400000).toISOString() },
      { pct: 60, at: new Date().toISOString() },
    ]);
    expect(msg).toContain("30%");
    expect(msg).toMatch(/~10 days/);
  });

  it("estimates days remaining from drain rate", () => {
    const days = estimateBatteryDaysRemaining([
      { pct: 90, at: new Date(Date.now() - 5 * 86400000).toISOString() },
      { pct: 60, at: new Date().toISOString() },
    ]);
    expect(days).toBeGreaterThan(9);
    expect(days).toBeLessThan(11);
  });
});
