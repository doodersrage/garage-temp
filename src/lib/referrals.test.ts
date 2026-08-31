import { describe, expect, it } from "vitest";
import {
  isLikelyNewUser,
  PRO_TRIAL_DAYS,
  referralBonusTrialDays,
  referralRewardTrialDays,
} from "./referrals";

describe("referral trial days", () => {
  it("adds referrer reward trial days from metadata", () => {
    expect(referralRewardTrialDays({ referral_reward_days: 14 })).toBe(14);
    expect(referralBonusTrialDays("abc")).toBe(7);
  });

  it("adds bonus trial days for referred users", () => {
    expect(referralBonusTrialDays("abc123")).toBe(7);
    expect(referralBonusTrialDays(null)).toBe(0);
    expect(PRO_TRIAL_DAYS + referralBonusTrialDays("x")).toBe(21);
  });
});

describe("isLikelyNewUser", () => {
  it("detects likely new OAuth users", () => {
    const recent = new Date(Date.now() - 60_000).toISOString();
    const old = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(isLikelyNewUser(recent)).toBe(true);
    expect(isLikelyNewUser(old)).toBe(false);
  });
});
