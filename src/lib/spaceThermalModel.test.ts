import { describe, expect, it } from "vitest";
import { estimateTimeToFreeze } from "./timeToFreeze";
import {
  buildTimeToFreezeProjection,
  evaluateRunwayAlert,
  fitSpaceThermalParams,
  formatHitsAtLabel,
  outdoorPointsFromHourly,
  pairIndoorOutdoor,
  shouldAlertOnRunway,
} from "./spaceThermalModel";
import { DEFAULT_ALERT_SETTINGS } from "./alerts";

const nowMs = Date.parse("2026-01-15T00:00:00.000Z");

function hourlyOutdoor(startMs: number, temps: number[], stepHours = 1) {
  return temps.map((tempF, index) => ({
    atMs: startMs + index * stepHours * 60 * 60 * 1000,
    tempF,
  }));
}

describe("space thermal model", () => {
  it("pairs indoor samples with interpolated outdoor", () => {
    const outdoor = hourlyOutdoor(nowMs, [20, 22]);
    const pairs = pairIndoorOutdoor(
      [
        { at: "2026-01-15T00:30:00.000Z", tempF: 38 },
        { at: "2026-01-15T01:00:00.000Z", tempF: 37 },
      ],
      outdoor,
    );
    expect(pairs).toHaveLength(2);
    expect(pairs[0]!.outdoorF).toBe(21);
    expect(pairs[1]!.outdoorF).toBe(22);
  });

  it("fits a positive offset and coupling from a cooling garage", () => {
    const pairs = [];
    let indoor = 45;
    const offset = 12;
    const k = 0.3;
    for (let hour = 0; hour < 36; hour += 1) {
      const outdoor = 20;
      const tEq = outdoor + offset;
      indoor = tEq + (indoor - tEq) * Math.exp(-k);
      pairs.push({
        atMs: nowMs + hour * 3600_000,
        indoorF: indoor,
        outdoorF: outdoor,
      });
    }
    const params = fitSpaceThermalParams(pairs);
    expect(params).not.toBeNull();
    expect(params!.offsetF).toBeGreaterThan(8);
    expect(params!.offsetF).toBeLessThan(16);
    expect(params!.fittedCoupling).toBe(true);
    expect(params!.couplingPerHour).toBeGreaterThan(0.15);
    expect(params!.couplingPerHour).toBeLessThan(0.5);
  });

  it("projects a clock time when outdoor forecast plunges", () => {
    const indoorSamples = [
      { at: "2026-01-14T18:00:00.000Z", tempF: 42 },
      { at: "2026-01-14T21:00:00.000Z", tempF: 40 },
      { at: "2026-01-15T00:00:00.000Z", tempF: 38 },
    ];
    const outdoorPast = outdoorPointsFromHourly([
      { timestamp: "2026-01-14T18:00:00Z", tempF: 28 },
      { timestamp: "2026-01-14T21:00:00Z", tempF: 24 },
      { timestamp: "2026-01-15T00:00:00Z", tempF: 20 },
    ]);
    const outdoorForecast = hourlyOutdoor(
      nowMs,
      [20, 15, 10, 8, 6, 5, 4, 4, 5, 8, 12, 16],
    );
    const projection = buildTimeToFreezeProjection({
      currentTempF: 38,
      freezeThresholdF: 32,
      indoorSamples,
      outdoorPast,
      outdoorForecast,
      nowMs,
      timeZone: "UTC",
      lookAheadHours: 12,
    });
    expect(projection.source).toBe("forecast_model");
    expect(projection.hours).not.toBeNull();
    expect(projection.hours!).toBeGreaterThan(0);
    expect(projection.hours!).toBeLessThan(12);
    expect(projection.hitsAtLabel).toBeTruthy();
    expect(projection.message).toMatch(/Hits 32°F around/i);
  });

  it("does not predict freeze when outdoor stays mild relative to this space", () => {
    const indoorSamples = Array.from({ length: 12 }, (_, hour) => ({
      at: new Date(nowMs - (12 - hour) * 3600_000).toISOString(),
      tempF: 44,
    }));
    const outdoorPast = hourlyOutdoor(nowMs - 12 * 3600_000, Array(13).fill(32));
    const outdoorForecast = hourlyOutdoor(nowMs, Array(16).fill(34));
    const projection = buildTimeToFreezeProjection({
      currentTempF: 44,
      freezeThresholdF: 32,
      indoorSamples,
      outdoorPast,
      outdoorForecast,
      nowMs,
      timeZone: "UTC",
      lookAheadHours: 12,
    });
    expect(projection.source).toBe("forecast_model");
    expect(projection.hours).toBeNull();
    expect(projection.message).toMatch(/No freeze/i);
  });

  it("falls back to a linear trend clock without outdoor data", () => {
    const projection = buildTimeToFreezeProjection({
      currentTempF: 40,
      freezeThresholdF: 32,
      indoorSamples: [
        { at: "2026-01-15T00:00:00.000Z", tempF: 44 },
        { at: "2026-01-15T04:00:00.000Z", tempF: 40 },
      ],
      nowMs: Date.parse("2026-01-15T04:00:00.000Z"),
      timeZone: "UTC",
      lookAheadHours: 12,
    });
    expect(projection.source).toBe("trend");
    expect(projection.hours).toBe(8);
    expect(projection.hitsAtLabel).toContain("12:00");
  });
});

describe("runway alerts", () => {
  it("fires on a medium-confidence forecast hit inside the look-ahead window", () => {
    const projection = {
      hours: 3.2,
      hitsAtIso: "2026-01-15T03:12:00.000Z",
      hitsAtLabel: "3:12 AM",
      confidence: "medium" as const,
      source: "forecast_model" as const,
      currentTempF: 38,
      freezeThresholdF: 32,
      rateFPerHour: -1.4,
      params: {
        offsetF: 10,
        couplingPerHour: 0.3,
        sampleCount: 24,
        fittedCoupling: true,
      },
      lookAheadHours: 12,
      message: "Hits 32°F around 3:12 AM",
    };
    expect(shouldAlertOnRunway(projection, 12)).toBe(true);
    const message = evaluateRunwayAlert(
      { ...DEFAULT_ALERT_SETTINGS, enabled: true, runwayAlertEnabled: true, freezeThresholdF: 32, forecastHoursAhead: 12 },
      projection,
    );
    expect(message).toMatch(/projected to hit 32°F/i);
    expect(message).toMatch(/window before the probe crosses freeze/i);
  });

  it("does not fire when freeze alerts or runway alerts are off", () => {
    const projection = {
      hours: 3,
      hitsAtIso: "2026-01-15T03:00:00.000Z",
      hitsAtLabel: "3:00 AM",
      confidence: "high" as const,
      source: "forecast_model" as const,
      currentTempF: 38,
      freezeThresholdF: 32,
      rateFPerHour: -2,
      params: null,
      lookAheadHours: 12,
      message: "x",
    };
    expect(
      evaluateRunwayAlert(
        { ...DEFAULT_ALERT_SETTINGS, enabled: false, runwayAlertEnabled: true },
        projection,
      ),
    ).toBeNull();
    expect(
      evaluateRunwayAlert(
        { ...DEFAULT_ALERT_SETTINGS, enabled: true, runwayAlertEnabled: false },
        projection,
      ),
    ).toBeNull();
  });

  it("ignores a far-away low-confidence trend", () => {
    expect(
      shouldAlertOnRunway(
        {
          hours: 20,
          hitsAtIso: null,
          hitsAtLabel: null,
          confidence: "low",
          source: "trend",
          currentTempF: 50,
          freezeThresholdF: 32,
          rateFPerHour: -0.9,
          params: null,
          lookAheadHours: 12,
          message: "x",
        },
        12,
      ),
    ).toBe(false);
  });
});

describe("clock label", () => {
  it("says tomorrow when the hit is the next local day", () => {
    const label = formatHitsAtLabel(
      "2026-01-16T07:12:00.000Z",
      "UTC",
      new Date("2026-01-15T22:00:00.000Z"),
    );
    expect(label).toMatch(/tomorrow/i);
  });
});

describe("time to freeze trend helper", () => {
  it("estimates hours when cooling", () => {
    const result = estimateTimeToFreeze(40, 32, [
      { at: "2026-01-01T10:00:00Z", tempF: 42 },
      { at: "2026-01-01T12:00:00Z", tempF: 40 },
    ]);
    expect(result.hours).not.toBeNull();
    expect(result.rateFPerHour).toBeLessThan(0);
  });
});
