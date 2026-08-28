import { describe, expect, it } from "vitest";
import { buildHeatingInsights, estimateHeatingLossRate } from "./heatingInsights";

describe("heatingInsights", () => {
  it("detects rapid drop", () => {
    const points = [
      { timestamp: "2026-01-01T10:00:00Z", tempf: 40, humidity: 50, probeLabel: "garage" },
      { timestamp: "2026-01-01T11:00:00Z", tempf: 35, humidity: 50, probeLabel: "garage" },
    ];
    const rate = estimateHeatingLossRate(points, 10);
    expect(rate).toBeLessThan(-4);
    const insights = buildHeatingInsights({
      indoorPoints: points,
      outdoorTempF: 10,
      freezeThresholdF: 34,
    });
    expect(insights.some((i) => i.label.includes("Rapid"))).toBe(true);
  });
});
