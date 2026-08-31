import { describe, expect, it } from "vitest";
import { quietHoursAllowsSmsCritical, shouldSuppressForQuietHours } from "./quietHours";
import { DEFAULT_ALERT_SETTINGS } from "./alerts";

describe("quiet hours SMS critical", () => {
  const base = {
    ...DEFAULT_ALERT_SETTINGS,
    quietHoursEnabled: true,
    quietHoursStart: "00:00",
    quietHoursEnd: "23:59",
    quietHoursTimezone: "UTC",
    quietHoursBypassFreeze: false,
    quietHoursSmsCritical: true,
  };

  it("suppresses non-SMS channels during quiet hours", () => {
    expect(shouldSuppressForQuietHours(base, "threshold")).toBe(true);
  });

  it("allows SMS for threshold/forecast when sms critical is on", () => {
    expect(quietHoursAllowsSmsCritical(base, "threshold")).toBe(true);
    expect(quietHoursAllowsSmsCritical(base, "forecast")).toBe(true);
    expect(quietHoursAllowsSmsCritical(base, "flood")).toBe(true);
    expect(quietHoursAllowsSmsCritical(base, "rate")).toBe(false);
  });

  it("does not allow SMS critical when setting is off", () => {
    expect(
      quietHoursAllowsSmsCritical(
        { ...base, quietHoursSmsCritical: false },
        "threshold",
      ),
    ).toBe(false);
  });
});
