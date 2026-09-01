import { describe, expect, it } from "vitest";
import { buildThermalRunway } from "./thermalRunway";

describe("buildThermalRunway", () => {
  it("reports runway when cooling quickly", () => {
    const now = Date.now();
    const result = buildThermalRunway({
      currentTempF: 38,
      freezeThresholdF: 34,
      recentSamples: [
        { at: new Date(now - 60 * 60 * 1000).toISOString(), tempF: 42 },
        { at: new Date(now).toISOString(), tempF: 38 },
      ],
    });
    expect(result.hours).not.toBeNull();
    expect(result.rateFPerHour).toBeLessThan(0);
  });

  it("notes forecast cold", () => {
    const result = buildThermalRunway({
      currentTempF: 36,
      freezeThresholdF: 34,
      recentSamples: [
        { at: new Date(Date.now() - 3600_000).toISOString(), tempF: 37 },
        { at: new Date().toISOString(), tempF: 36 },
      ],
      forecastMinTempF: 20,
      forecastHoursAhead: 12,
    });
    expect(result.annotations.some((a) => a.includes("Forecast"))).toBe(true);
  });
});
