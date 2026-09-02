import { describe, expect, it } from "vitest";
import { computeGarageRiskStatus } from "./garageRiskStatus";

const base = {
  hasDevices: true,
  hasLiveReading: true,
  coldestProbeTempF: 45,
  freezeThresholdF: 34,
  staleSensorCount: 0,
  nightsRiskCount: 0,
  alertsEnabled: true,
  hasEmailAlerts: true,
  outdoorTempF: 40,
  showColdSnapChecklist: false,
};

describe("computeGarageRiskStatus", () => {
  it("asks for a device when none exist", () => {
    const status = computeGarageRiskStatus({ ...base, hasDevices: false });
    expect(status.level).toBe("watch");
    expect(status.actionHref).toContain("temperature");
  });

  it("flags freeze risk when coldest probe is at threshold", () => {
    const status = computeGarageRiskStatus({
      ...base,
      coldestProbeTempF: 32,
    });
    expect(status.level).toBe("risk");
  });

  it("returns ok when readings and alerts are healthy", () => {
    expect(computeGarageRiskStatus(base).level).toBe("ok");
  });

  it("nudges alert setup when space is otherwise fine", () => {
    const status = computeGarageRiskStatus({
      ...base,
      alertsEnabled: false,
      hasEmailAlerts: false,
    });
    expect(status.level).toBe("watch");
    expect(status.actionHref).toContain("alerts");
  });
});
