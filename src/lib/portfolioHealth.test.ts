import { describe, expect, it } from "vitest";
import { scorePropertyHealth } from "./portfolioHealth";
import type { PropertySnapshot } from "./crossProperty";

const base: PropertySnapshot = {
  householdId: "h1",
  name: "Garage",
  role: "owner",
  minTempF: 45,
  freezeThresholdF: 34,
  atRisk: false,
  lastReadingAt: new Date().toISOString(),
  deviceCount: 1,
};

describe("scorePropertyHealth", () => {
  it("flags missing devices as offline", () => {
    const health = scorePropertyHealth({ ...base, deviceCount: 0, lastReadingAt: null });
    expect(health.label).toBe("offline");
    expect(health.score).toBeLessThan(40);
  });

  it("flags at-risk properties", () => {
    const health = scorePropertyHealth({
      ...base,
      minTempF: 30,
      atRisk: true,
    });
    expect(health.label).toBe("at_risk");
  });

  it("scores healthy when reporting above threshold", () => {
    expect(scorePropertyHealth(base).label).toBe("healthy");
  });

  it("flags stale readings as watch", () => {
    const health = scorePropertyHealth({
      ...base,
      lastReadingAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    });
    expect(health.label).toBe("watch");
    expect(health.detail).toMatch(/stale/i);
  });
});
