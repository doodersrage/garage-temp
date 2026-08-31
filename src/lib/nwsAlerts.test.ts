import { describe, expect, it } from "vitest";
import { hasFreezeRelatedNwsAlert } from "./nwsAlerts";

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
