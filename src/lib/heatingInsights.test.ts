import { describe, expect, it } from "vitest";
import { buildHeatingInsights, dewPointF, estimateHeatingLossRate } from "./heatingInsights";

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

  it("estimates dew point near 50°F at 70°F / 50% RH", () => {
    const dp = dewPointF(70, 50);
    expect(dp).not.toBeNull();
    expect(dp!).toBeGreaterThan(49);
    expect(dp!).toBeLessThan(52);
  });

  it("flags condensation when air is close to dew point", () => {
    const insights = buildHeatingInsights({
      indoorPoints: [
        { timestamp: "2026-07-01T10:00:00Z", tempf: 55, humidity: 90, probeLabel: "garage" },
      ],
      outdoorTempF: 70,
      freezeThresholdF: 34,
    });
    expect(insights.some((i) => i.label === "Condensation risk")).toBe(true);
  });

  it("adds garage–house gap insight when a reference probe is set", () => {
    const insights = buildHeatingInsights({
      indoorPoints: [
        { timestamp: "2026-01-01T10:00:00Z", tempf: 38, humidity: 40, probeLabel: "garage" },
      ],
      outdoorTempF: 20,
      freezeThresholdF: 34,
      houseTempF: 72,
    });
    expect(insights.some((i) => i.label === "Garage–house gap")).toBe(true);
  });

  it("adds garage–house gap insight when a thermostat is connected", () => {
    const insights = buildHeatingInsights({
      indoorPoints: [
        { timestamp: "2026-01-01T10:00:00Z", tempf: 38, humidity: 40, probeLabel: "garage" },
      ],
      outdoorTempF: 20,
      freezeThresholdF: 34,
      thermostatSnapshot: {
        provider: "nest",
        ambientTempF: 79,
        heatSetpointF: 80,
        hvacMode: "COOL",
      },
    });
    expect(insights.some((i) => i.label === "Garage–house gap")).toBe(true);
  });

  it("notes HVAC cooling when the probe runs hotter than the house", () => {
    const insights = buildHeatingInsights({
      indoorPoints: [
        { timestamp: "2026-07-01T14:00:00Z", tempf: 95, humidity: 35, probeLabel: "garage" },
      ],
      outdoorTempF: 88,
      freezeThresholdF: 34,
      thermostatSnapshot: {
        provider: "nest",
        ambientTempF: 79,
        heatSetpointF: 80,
        hvacMode: "COOL",
      },
    });
    expect(insights.some((i) => i.label === "HVAC cooling")).toBe(true);
  });
});
