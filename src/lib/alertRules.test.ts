import { describe, expect, it } from "vitest";
import { evaluateAlertRules, type AlertRule } from "./alertRules";
import {
  DEFAULT_ALERT_SETTINGS,
  evaluateForecastFreeze,
} from "./alerts";
import {
  isInQuietHours,
  isWithinQuietWindow,
  shouldSuppressForQuietHours,
} from "./quietHours";
import { minForecastTempInWindow } from "./FetchWeather";
import { compareYearOverYear } from "./seasonalInsights";

describe("quiet hours", () => {
  it("handles overnight windows", () => {
    // 23:00 is inside 22:00–07:00
    const late = new Date("2026-01-15T04:00:00.000Z"); // depends on TZ math via Intl
    expect(isWithinQuietWindow("22:00", "07:00", "UTC", new Date("2026-01-15T23:00:00.000Z"))).toBe(
      true,
    );
    expect(isWithinQuietWindow("22:00", "07:00", "UTC", new Date("2026-01-15T12:00:00.000Z"))).toBe(
      false,
    );
    void late;
  });

  it("bypasses freeze/forecast when configured", () => {
    const settings = {
      ...DEFAULT_ALERT_SETTINGS,
      quietHoursEnabled: true,
      quietHoursStart: "00:00",
      quietHoursEnd: "23:59",
      quietHoursTimezone: "UTC",
      quietHoursBypassFreeze: true,
    };
    const noon = new Date("2026-01-15T12:00:00.000Z");
    expect(isInQuietHours(settings, noon)).toBe(true);
    expect(shouldSuppressForQuietHours(settings, "rate", noon)).toBe(true);
    expect(shouldSuppressForQuietHours(settings, "threshold", noon)).toBe(false);
    expect(shouldSuppressForQuietHours(settings, "forecast", noon)).toBe(false);
  });
});

describe("forecast freeze", () => {
  it("picks min temp in forecast window", () => {
    const now = Date.parse("2026-01-15T12:00:00.000Z");
    const result = minForecastTempInWindow(
      {
        city: { name: "Testville" },
        list: [
          { dt: now / 1000 + 3600, main: { temp: 40 } },
          { dt: now / 1000 + 7200, main: { temp: 28 } },
          { dt: now / 1000 + 20 * 3600, main: { temp: 10 } },
        ],
      },
      12,
      now,
    );
    expect(result?.minTempF).toBe(28);
  });

  it("evaluates against freeze threshold", () => {
    const settings = {
      ...DEFAULT_ALERT_SETTINGS,
      enabled: true,
      forecastFreezeEnabled: true,
      freezeThresholdF: 34,
      forecastHoursAhead: 12,
    };
    expect(evaluateForecastFreeze(settings, 30, 12)).toContain("30.0");
    expect(evaluateForecastFreeze(settings, 40, 12)).toBeNull();
  });
});

describe("alert rules", () => {
  it("requires all AND conditions", () => {
    const rules: AlertRule[] = [
      {
        id: "1",
        enabled: true,
        name: "Door + cold",
        all: [{ type: "door_open" }, { type: "temp_below", value: 34 }],
      },
    ];
    const miss = evaluateAlertRules(rules, {
      readings: [{ label: "G", tempf: 30, humidity: 40 }],
      boolSensors: [{ label: "Door", kind: "door", value: false }],
      numericSensors: [],
      doorOpenSessions: [],
      rateDrops: [],
      outages: [],
      freezeThresholdF: 34,
      humidityThreshold: 75,
      rateChangeF: 15,
      outageHours: 2,
    });
    expect(miss).toHaveLength(0);

    const hit = evaluateAlertRules(rules, {
      readings: [{ label: "G", tempf: 30, humidity: 40 }],
      boolSensors: [{ label: "Door", kind: "door", value: true }],
      numericSensors: [],
      doorOpenSessions: [],
      rateDrops: [],
      outages: [],
      freezeThresholdF: 34,
      humidityThreshold: 75,
      rateChangeF: 15,
      outageHours: 2,
    });
    expect(hit[0]).toContain("Door + cold");
  });

  it("matches co2_above against numeric sensors", () => {
    const rules: AlertRule[] = [
      {
        id: "co2",
        enabled: true,
        name: "High CO2",
        all: [{ type: "co2_above", value: 1000 }],
      },
    ];
    expect(
      evaluateAlertRules(rules, {
        readings: [],
        boolSensors: [],
        numericSensors: [{ label: "Air", kind: "co2", value: 900 }],
        doorOpenSessions: [],
        rateDrops: [],
        outages: [],
        freezeThresholdF: 34,
        humidityThreshold: 75,
        rateChangeF: 15,
        outageHours: 2,
      }),
    ).toHaveLength(0);
    expect(
      evaluateAlertRules(rules, {
        readings: [],
        boolSensors: [],
        numericSensors: [{ label: "Air", kind: "co2", value: 1200 }],
        doorOpenSessions: [],
        rateDrops: [],
        outages: [],
        freezeThresholdF: 34,
        humidityThreshold: 75,
        rateChangeF: 15,
        outageHours: 2,
      })[0],
    ).toContain("High CO2");
  });

  it("matches workshop numeric and motion rules", () => {
    const rules: AlertRule[] = [
      { id: "aqi", enabled: true, name: "Dusty", all: [{ type: "pm25_above", value: 35 }] },
      { id: "pir", enabled: true, name: "Motion", all: [{ type: "motion_detected" }] },
      { id: "sump", enabled: true, name: "Sump high", all: [{ type: "level_above", value: 80 }] },
    ];
    const base = {
      readings: [] as Array<{ label: string; tempf: number; humidity: number }>,
      doorOpenSessions: [] as Array<{
        label: string;
        durationMs: number | null;
        stillOpen: boolean;
      }>,
      rateDrops: [] as Array<{ label: string; dropF: number }>,
      outages: [] as Array<{ deviceName: string; hoursSilent: number }>,
      freezeThresholdF: 34,
      humidityThreshold: 75,
      rateChangeF: 15,
      outageHours: 2,
    };
    expect(
      evaluateAlertRules(rules, {
        ...base,
        boolSensors: [{ label: "Bay", kind: "motion", value: false }],
        numericSensors: [{ label: "Air", kind: "pm25", value: 12 }],
      }),
    ).toHaveLength(0);
    expect(
      evaluateAlertRules(rules, {
        ...base,
        boolSensors: [{ label: "Bay", kind: "motion", value: true }],
        numericSensors: [
          { label: "Air", kind: "pm25", value: 40 },
          { label: "Sump", kind: "level", value: 90 },
        ],
      }),
    ).toHaveLength(3);
  });
});

describe("year over year", () => {
  it("compares averages", () => {
    const insight = compareYearOverYear(
      [
        { timestamp: "2026-01-01", tempf: 40, humidity: 40, probeLabel: "A" },
        { timestamp: "2026-01-02", tempf: 50, humidity: 40, probeLabel: "A" },
      ],
      [
        { timestamp: "2025-01-01", tempf: 30, humidity: 40, probeLabel: "A" },
        { timestamp: "2025-01-02", tempf: 40, humidity: 40, probeLabel: "A" },
      ],
    );
    expect(insight?.detail).toContain("+10.0");
  });
});
