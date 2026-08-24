import { describe, expect, it } from "vitest";
import {
  ALERT_COOLDOWN_MS,
  evaluateAlerts,
  getAlertSettingsFromMetadata,
  isAlertCooldownActive,
} from "./alerts";
import { detectTemperatureAnomalies } from "./anomalyDetection";

describe("evaluateAlerts", () => {
  it("flags freeze and humidity thresholds", () => {
    const settings = {
      enabled: true,
      freezeThresholdF: 34,
      humidityThreshold: 75,
      email: null,
      lastAlertSentAt: null,
    };

    const messages = evaluateAlerts(settings, [
      { label: "Probe 1", tempf: 30, humidity: 50 },
      { label: "Probe 2", tempf: 40, humidity: 80 },
    ]);

    expect(messages).toHaveLength(2);
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
