import { describe, expect, it } from "vitest";
import { estimateTimeToFreeze } from "./timeToFreeze";
import { compareWeekAverages } from "./weekCompare";
import { filterChannelsForSpace } from "./spaceChannelRouting";
import { DEFAULT_ALERT_SETTINGS } from "./alerts";
import { referralBonusTrialDays, referralRewardTrialDays } from "./referrals";
import { flagIngestAbuse } from "./ingestAbuse";
import { batterySparklinePath } from "./batterySparkline";

describe("time to freeze", () => {
  it("estimates hours when cooling", () => {
    const result = estimateTimeToFreeze(40, 32, [
      { at: "2026-01-01T10:00:00Z", tempF: 42 },
      { at: "2026-01-01T12:00:00Z", tempF: 40 },
    ]);
    expect(result.hours).not.toBeNull();
    expect(result.rateFPerHour).toBeLessThan(0);
  });
});

describe("week compare", () => {
  it("computes average delta", () => {
    const result = compareWeekAverages(
      [
        { timestamp: "a", tempf: 40, humidity: 50, probeLabel: "Garage" },
        { timestamp: "b", tempf: 42, humidity: 50, probeLabel: "Garage" },
      ],
      [{ timestamp: "c", tempf: 38, humidity: 50, probeLabel: "Garage" }],
    );
    expect(result.deltaF).toBe(3);
  });
});

describe("space channel routing", () => {
  it("restricts channels for a space", () => {
    const settings = {
      ...DEFAULT_ALERT_SETTINGS,
      spaceChannelRouting: {
        garage: { threshold: ["telegram"] },
      },
    };
    const filtered = filterChannelsForSpace(
      settings,
      "garage",
      "threshold",
      ["email", "telegram", "sms"],
    );
    expect(filtered).toEqual(["telegram"]);
  });
});

describe("referral rewards", () => {
  it("adds referrer reward trial days from metadata", () => {
    expect(referralRewardTrialDays({ referral_reward_days: 14 })).toBe(14);
    expect(referralBonusTrialDays("abc")).toBe(7);
  });
});

describe("ingest abuse", () => {
  it("flags high error rates", () => {
    const flagged = flagIngestAbuse([
      {
        device_id: "d1",
        day: "2026-01-01",
        success_count: 2,
        error_count: 8,
        device_name: "ESP",
      },
    ]);
    expect(flagged).toHaveLength(1);
    expect(flagged[0]?.errorRate).toBe(0.8);
  });
});

describe("battery sparkline", () => {
  it("builds svg path from history", () => {
    const path = batterySparklinePath([
      { pct: 90, at: "2026-01-01T10:00:00Z" },
      { pct: 70, at: "2026-01-01T12:00:00Z" },
    ]);
    expect(path.startsWith("M")).toBe(true);
  });
});
