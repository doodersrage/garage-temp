import { describe, expect, it } from "vitest";
import { shouldShowColdSnapChecklist } from "./coldSnapChecklist";

describe("shouldShowColdSnapChecklist", () => {
  it("shows when nights are at risk or NWS alerts fire", () => {
    expect(
      shouldShowColdSnapChecklist({
        nightsRiskCount: 1,
        outdoorTempF: 50,
        hasNwsFreezeAlerts: false,
      }),
    ).toBe(true);
    expect(
      shouldShowColdSnapChecklist({
        nightsRiskCount: 0,
        outdoorTempF: 50,
        hasNwsFreezeAlerts: true,
      }),
    ).toBe(true);
  });

  it("shows when outdoor temp is at or below 35°F", () => {
    expect(
      shouldShowColdSnapChecklist({
        nightsRiskCount: 0,
        outdoorTempF: 35,
        hasNwsFreezeAlerts: false,
      }),
    ).toBe(true);
    expect(
      shouldShowColdSnapChecklist({
        nightsRiskCount: 0,
        outdoorTempF: 36,
        hasNwsFreezeAlerts: false,
      }),
    ).toBe(false);
  });
});
