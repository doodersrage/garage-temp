import { describe, expect, it } from "vitest";
import { computeFreezeReadiness, hasConfiguredAlertChannel } from "./freezeReadiness";
import { DEFAULT_ALERT_SETTINGS } from "./alerts";

describe("computeFreezeReadiness", () => {
  it("scores low when alerts are off", () => {
    const result = computeFreezeReadiness({
      alertSettings: { ...DEFAULT_ALERT_SETTINGS, enabled: false },
      devices: [{ id: "d1", name: "Garage", sensors: [] } as never],
      latest: [],
      weatherLocationConfigured: false,
      canUseForecast: false,
      canUseNws: false,
      hasSentAnyAlert: false,
    });
    expect(result.score).toBeLessThanOrEqual(60);
    expect(result.ready).toBe(false);
  });

  it("detects configured alert channels", () => {
    expect(
      hasConfiguredAlertChannel({
        ...DEFAULT_ALERT_SETTINGS,
        channelEmail: true,
        email: "a@example.com",
      }),
    ).toBe(true);
    expect(hasConfiguredAlertChannel(DEFAULT_ALERT_SETTINGS)).toBe(false);
  });

  it("scores high when core checks pass", () => {
    const result = computeFreezeReadiness({
      alertSettings: {
        ...DEFAULT_ALERT_SETTINGS,
        enabled: true,
        channelEmail: true,
        email: "a@example.com",
        forecastFreezeEnabled: true,
        nwsFreezeAlertsEnabled: true,
      },
      devices: [
        {
          id: "d1",
          name: "Garage",
          sensors: [{ id: "f1", kind: "flood", label: "Pad" }],
        } as never,
      ],
      latest: [{ sensor: { id: "s1", label: "T", kind: "temperature" }, value_num: 40, recorded_at: new Date().toISOString() } as never],
      weatherLocationConfigured: true,
      canUseForecast: true,
      canUseNws: true,
      hasSentAnyAlert: true,
    });
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.ready).toBe(true);
    expect(result.checks.find((c) => c.id === "flood_sensor")?.ok).toBe(true);
  });

  it("fails ready when vacation mode is on", () => {
    const result = computeFreezeReadiness({
      alertSettings: {
        ...DEFAULT_ALERT_SETTINGS,
        enabled: true,
        channelEmail: true,
        email: "a@example.com",
        vacationUntil: new Date(Date.now() + 86400000).toISOString(),
        forecastFreezeEnabled: true,
        nwsFreezeAlertsEnabled: true,
      },
      devices: [{ id: "d1", name: "Garage", sensors: [] } as never],
      latest: [{ sensor: { id: "s1", label: "T", kind: "temperature" }, value_num: 40, recorded_at: new Date().toISOString() } as never],
      weatherLocationConfigured: true,
      canUseForecast: true,
      canUseNws: true,
      hasSentAnyAlert: true,
    });
    expect(result.checks.find((c) => c.id === "vacation_clear")?.ok).toBe(false);
    expect(result.ready).toBe(false);
  });
});
