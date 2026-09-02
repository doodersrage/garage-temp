import { describe, expect, it } from "vitest";
import {
  ALERT_COOLDOWN_MS,
  DEFAULT_ALERT_SETTINGS,
  evaluateAlerts,
  evaluateBatteryHealth,
  evaluateFloodAlerts,
  evaluateOutage,
  evaluateRateChange,
  evaluateRssiHealth,
  getAlertSettingsFromMetadata,
  isAlertCooldownActive,
  parseChannelSeverity,
} from "./alerts";
import { detectTemperatureAnomalies } from "./anomalyDetection";
import { parseIngestPayload, inferSensorKind } from "./ingestPayload";
import { resolvePlanTierFromPriceId } from "./planTier";
import { summarizeSeasonal } from "./seasonalInsights";
import { computeIndoorOutdoorDelta } from "./indoorOutdoorDelta";

describe("evaluateAlerts", () => {
  it("flags freeze and humidity thresholds", () => {
    const settings = {
      ...DEFAULT_ALERT_SETTINGS,
      enabled: true,
      freezeThresholdF: 34,
      humidityThreshold: 75,
    };

    const messages = evaluateAlerts(settings, [
      { label: "Probe 1", tempf: 30, humidity: 50 },
      { label: "Probe 2", tempf: 40, humidity: 80 },
    ]);

    expect(messages).toHaveLength(2);
  });

  it("flags wet flood sensors when alerts are enabled", () => {
    const enabled = evaluateFloodAlerts(
      { ...DEFAULT_ALERT_SETTINGS, enabled: true },
      [{ label: "Sump pit" }, { label: "Water heater" }],
    );
    expect(enabled).toEqual([
      "Sump pit flood / leak sensor is wet.",
      "Water heater flood / leak sensor is wet.",
    ]);
    expect(
      evaluateFloodAlerts(DEFAULT_ALERT_SETTINGS, [{ label: "Sump pit" }]),
    ).toEqual([]);
  });
});

describe("alert cooldown", () => {
  it("blocks alerts inside the cooldown window", () => {
    const now = Date.parse("2026-08-24T12:00:00.000Z");
    const settings = getAlertSettingsFromMetadata({
      alert_settings: {
        enabled: true,
        last_alert_sent_at: "2026-08-24T10:30:00.000Z",
      },
    });

    expect(isAlertCooldownActive(settings, now)).toBe(true);
    expect(
      isAlertCooldownActive(settings, now + ALERT_COOLDOWN_MS + 1),
    ).toBe(false);
  });
});

describe("rate and outage alerts", () => {
  it("detects rapid temperature change", () => {
    const settings = { ...DEFAULT_ALERT_SETTINGS, enabled: true, rateChangeF: 15 };
    const msg = evaluateRateChange(settings, "Garage", [55, 50, 38]);
    expect(msg).toContain("changed");
  });

  it("detects device outage", () => {
    const settings = { ...DEFAULT_ALERT_SETTINGS, enabled: true, outageHours: 2 };
    const now = Date.parse("2026-08-24T12:00:00.000Z");
    const msg = evaluateOutage(
      settings,
      "Garage ESP",
      "2026-08-24T08:00:00.000Z",
      now,
    );
    expect(msg).toContain("silent");
  });

  it("skips outage when threshold is disabled (0 hours)", () => {
    const settings = { ...DEFAULT_ALERT_SETTINGS, enabled: true, outageHours: 0 };
    expect(
      evaluateOutage(settings, "Garage ESP", null, Date.now()),
    ).toBeNull();
  });
});

describe("ingest payload", () => {
  it("parses classic temp JSON and typed sensors", () => {
    const { tempProbes, typed } = parseIngestPayload({
      temp: { "0": { c: 10, f: 50, h: 40 } },
      sensors: [{ key: "door1", bool: true, kind: "door" }],
    });
    expect(tempProbes["0"]?.f).toBe(50);
    expect(typed).toHaveLength(1);
    expect(inferSensorKind("door1", typed[0]!)).toBe("door");
  });
});

describe("entitlements price mapping", () => {
  it("defaults unknown prices to member", () => {
    expect(resolvePlanTierFromPriceId("price_abc")).toBe("member");
  });
});

describe("seasonal insights", () => {
  it("summarizes extremes", () => {
    const insights = summarizeSeasonal(
      [
        { timestamp: "2026-01-01T00:00:00Z", tempf: 20, humidity: 30, probeLabel: "A" },
        { timestamp: "2026-01-02T00:00:00Z", tempf: 40, humidity: 80, probeLabel: "A" },
      ],
      30,
    );
    expect(insights.length).toBeGreaterThanOrEqual(3);
  });
});

describe("indoor outdoor delta", () => {
  it("computes garage vs outdoor difference", () => {
    const delta = computeIndoorOutdoorDelta(
      [
        { timestamp: "2026-01-01T00:00:00Z", tempf: 50, humidity: 40, probeLabel: "A" },
        { timestamp: "2026-01-01T01:00:00Z", tempf: 60, humidity: 40, probeLabel: "A" },
      ],
      40,
      "clear sky",
      "Testville",
    );
    expect(delta?.indoorAvgF).toBe(55);
    expect(delta?.deltaF).toBe(15);
  });
});

describe("detectTemperatureAnomalies", () => {
  it("detects rapid temperature drops", () => {
    const notices = detectTemperatureAnomalies([
      {
        probeLabel: "Garage",
        timestamp: "2026-08-24T10:00:00.000Z",
        tempf: 55,
        humidity: 40,
      },
      {
        probeLabel: "Garage",
        timestamp: "2026-08-24T10:30:00.000Z",
        tempf: 40,
        humidity: 42,
      },
    ]);

    expect(notices).toHaveLength(1);
    expect(notices[0]?.severity).toBe("warning");
  });
});

describe("parseChannelSeverity", () => {
  it("keeps known kinds and channels only", () => {
    expect(
      parseChannelSeverity({
        threshold: ["sms", "email", "carrier-pigeon"],
        mystery: ["email"],
        forecast: "sms",
      }),
    ).toEqual({
      threshold: ["sms", "email"],
    });
  });

  it("returns empty for invalid JSON shapes", () => {
    expect(parseChannelSeverity(null)).toEqual({});
    expect(parseChannelSeverity([])).toEqual({});
  });
});

describe("device health alerts", () => {
  it("flags low battery", () => {
    const settings = { ...DEFAULT_ALERT_SETTINGS, enabled: true, batteryAlertsEnabled: true };
    const msgs = evaluateBatteryHealth(settings, [
      { deviceName: "ESP", batteryPct: 15, rssi: null },
    ]);
    expect(msgs).toHaveLength(1);
  });

  it("flags weak rssi", () => {
    const settings = { ...DEFAULT_ALERT_SETTINGS, enabled: true, rssiAlertsEnabled: true };
    const msgs = evaluateRssiHealth(settings, [
      { deviceName: "ESP", batteryPct: null, rssi: -90 },
    ]);
    expect(msgs).toHaveLength(1);
  });
});
