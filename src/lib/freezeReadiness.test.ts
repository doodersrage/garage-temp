import { describe, expect, it } from "vitest";
import { computeFreezeReadiness } from "./freezeReadiness";
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
    expect(result.score).toBeLessThan(50);
    expect(result.ready).toBe(false);
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
      devices: [{ id: "d1", name: "Garage", sensors: [] } as never],
      latest: [{ sensor: { id: "s1", label: "T", kind: "temperature" }, value_num: 40, recorded_at: new Date().toISOString() } as never],
      weatherLocationConfigured: true,
      canUseForecast: true,
      canUseNws: true,
      hasSentAnyAlert: true,
    });
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.ready).toBe(true);
  });
});
