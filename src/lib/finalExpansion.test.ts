import { describe, expect, it } from "vitest";
import { applyAlertTemplates } from "./alertTemplates";
import { buildDoorEventRows } from "./doorEvents";
import type { DoorOpenSession } from "./doorDuration";
import {
  isLikelyNewUser,
  PRO_TRIAL_DAYS,
  referralBonusTrialDays,
} from "./referrals";

describe("referrals", () => {
  it("adds bonus trial days for referred users", () => {
    expect(referralBonusTrialDays("abc123")).toBe(7);
    expect(referralBonusTrialDays(null)).toBe(0);
    expect(PRO_TRIAL_DAYS + referralBonusTrialDays("x")).toBe(21);
  });

  it("detects likely new OAuth users", () => {
    const recent = new Date(Date.now() - 60_000).toISOString();
    const old = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(isLikelyNewUser(recent)).toBe(true);
    expect(isLikelyNewUser(old)).toBe(false);
  });
});

describe("door event rows", () => {
  const sessions: DoorOpenSession[] = [
    {
      label: "Garage door",
      openedAt: "2026-01-01T12:00:00Z",
      closedAt: "2026-01-01T12:30:00Z",
      durationMs: 30 * 60 * 1000,
      stillOpen: false,
    },
    {
      label: "Garage door",
      openedAt: "2026-01-01T14:00:00Z",
      closedAt: null,
      durationMs: null,
      stillOpen: true,
    },
  ];

  it("skips open sessions and duplicates", () => {
    const existing = new Set(["Garage door:2026-01-01T12:00:00Z"]);
    const sensorMap = new Map([["Garage door", "sensor-1"]]);
    const rows = buildDoorEventRows("hh-1", sessions, existing, sensorMap);
    expect(rows).toHaveLength(0);
  });

  it("maps sensor ids by label", () => {
    const rows = buildDoorEventRows(
      "hh-1",
      sessions,
      new Set(),
      new Map([["Garage door", "sensor-1"]]),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sensor_id).toBe("sensor-1");
    expect(rows[0]?.duration_ms).toBe(30 * 60 * 1000);
  });
});

describe("alert template kinds", () => {
  it("applies battery kind template", () => {
    const result = applyAlertTemplates(
      { title: "Battery", body: "Low", kind: "battery" },
      { battery: { title: "{{kind}} alert", body: "{{body}}!" } },
    );
    expect(result.title).toBe("battery alert");
    expect(result.body).toBe("Low!");
  });
});
