import { describe, expect, it } from "vitest";
import {
  isSnoozeActive,
  isVacationActive,
  shouldSuppressForSnoozeOrVacation,
  snoozeUntilFromHours,
} from "./alertSnooze";
import { evaluateBatteryHealth, evaluateRssiHealth, DEFAULT_ALERT_SETTINGS } from "./alerts";
import { computeDoorOpenSessions, formatDurationMs } from "./doorDuration";
import { hasFreezeRelatedNwsAlert } from "./nwsAlerts";
import { compareSpaceAverages } from "./seasonalInsights";

describe("alert snooze and vacation", () => {
  it("snooze blocks threshold but not outage", () => {
    const settings = {
      ...DEFAULT_ALERT_SETTINGS,
      snoozeUntil: snoozeUntilFromHours(1),
    };
    expect(isSnoozeActive(settings)).toBe(true);
    expect(shouldSuppressForSnoozeOrVacation(settings, "threshold")).toBe(true);
    expect(shouldSuppressForSnoozeOrVacation(settings, "outage")).toBe(false);
    expect(shouldSuppressForSnoozeOrVacation(settings, "flood")).toBe(false);
  });

  it("vacation blocks rate alerts", () => {
    const settings = {
      ...DEFAULT_ALERT_SETTINGS,
      vacationUntil: new Date(Date.now() + 86400000).toISOString(),
    };
    expect(isVacationActive(settings)).toBe(true);
    expect(shouldSuppressForSnoozeOrVacation(settings, "rate")).toBe(true);
    expect(shouldSuppressForSnoozeOrVacation(settings, "forecast")).toBe(false);
    expect(shouldSuppressForSnoozeOrVacation(settings, "flood")).toBe(false);
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

describe("door duration", () => {
  it("computes closed session length", () => {
    const sessions = computeDoorOpenSessions([
      { label: "Door", kind: "door", value: true, recordedAt: "2026-01-01T10:00:00Z" },
      { label: "Door", kind: "door", value: false, recordedAt: "2026-01-01T10:30:00Z" },
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.durationMs).toBe(30 * 60 * 1000);
    expect(formatDurationMs(sessions[0]!.durationMs!)).toBe("30 min");
  });
});

describe("space averages", () => {
  it("compares two spaces", () => {
    const map = new Map([
      ["Probe A", "garage"],
      ["Probe B", "attic"],
    ]);
    const lines = compareSpaceAverages(
      [
        { timestamp: "t", tempf: 40, humidity: 50, probeLabel: "Probe A" },
        { timestamp: "t", tempf: 55, humidity: 50, probeLabel: "Probe B" },
      ],
      map,
    );
    expect(lines[0]).toContain("attic");
  });
});

describe("NWS helpers", () => {
  it("detects freeze-related alerts", () => {
    expect(
      hasFreezeRelatedNwsAlert({
        lat: 36,
        lon: -86,
        alerts: [{ event: "Freeze Warning", headline: "Cold", severity: "Moderate", expires: null }],
      }),
    ).toBe(true);
  });
});
