import { describe, expect, it } from "vitest";
import {
  isSnoozeActive,
  isVacationActive,
  shouldSuppressForSnoozeOrVacation,
  snoozeUntilFromHours,
} from "./alertSnooze";
import { DEFAULT_ALERT_SETTINGS } from "./alerts";

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
