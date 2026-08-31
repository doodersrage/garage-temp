import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isLikelyNewUser,
  PRO_TRIAL_DAYS,
  referralBonusTrialDays,
  referralRewardTrialDays,
} from "./referrals";

const mockUpdateUserById = vi.fn();
const mockGetUserById = vi.fn();
const mockUpsert = vi.fn();
const mockFrom = vi.fn();

vi.mock("./supabase", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        updateUserById: (...args: unknown[]) => mockUpdateUserById(...args),
        getUserById: (...args: unknown[]) => mockGetUserById(...args),
      },
    },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
  createServerClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

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

function mockQuery(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "upsert", "update"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  (builder as { then: unknown }).then = (
    resolve: (value: unknown) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

describe("applyReferralForNewUser", () => {
  beforeEach(() => {
    mockUpdateUserById.mockReset().mockResolvedValue({ error: null });
    mockGetUserById.mockReset();
    mockFrom.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores referred_by in app_metadata, not user_metadata", async () => {
    mockFrom
      .mockReturnValueOnce(mockQuery({ data: { user_id: "referrer-1" }, error: null })) // resolveReferrerUserId
      .mockReturnValueOnce(mockQuery({ error: null })); // recordReferralSignup upsert

    const { applyReferralForNewUser } = await import("./referrals");
    await applyReferralForNewUser("new-user", "ABC123", { existing_key: "keep-me" });

    expect(mockUpdateUserById).toHaveBeenCalledWith("new-user", {
      app_metadata: { existing_key: "keep-me", referred_by: "abc123" },
    });
  });

  it("is a no-op when the user was already referred (checked via app_metadata)", async () => {
    const { applyReferralForNewUser } = await import("./referrals");
    await applyReferralForNewUser("new-user", "abc123", { referred_by: "already-set" });

    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });

  it("is a no-op for an unknown referral code", async () => {
    mockFrom.mockReturnValueOnce(mockQuery({ data: null, error: null }));

    const { applyReferralForNewUser } = await import("./referrals");
    await applyReferralForNewUser("new-user", "bogus", {});

    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });
});

describe("grantReferrerRewardOnSubscription", () => {
  beforeEach(() => {
    mockUpdateUserById.mockReset().mockResolvedValue({ error: null });
    mockGetUserById.mockReset();
    mockFrom.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("grants the reward via app_metadata, not user_metadata", async () => {
    mockFrom
      .mockReturnValueOnce(
        mockQuery({
          data: { referrer_user_id: "referrer-1", referrer_rewarded_at: null },
          error: null,
        }),
      )
      .mockReturnValueOnce(mockQuery({ error: null })); // mark rewarded
    mockGetUserById.mockResolvedValue({
      data: { user: { app_metadata: { referral_reward_days: 7 } } },
    });

    const { grantReferrerRewardOnSubscription } = await import("./referrals");
    await grantReferrerRewardOnSubscription("referred-user");

    expect(mockUpdateUserById).toHaveBeenCalledWith("referrer-1", {
      app_metadata: { referral_reward_days: 14 },
    });
  });

  it("is a no-op when already rewarded", async () => {
    mockFrom.mockReturnValueOnce(
      mockQuery({
        data: { referrer_user_id: "referrer-1", referrer_rewarded_at: "2026-01-01T00:00:00.000Z" },
        error: null,
      }),
    );

    const { grantReferrerRewardOnSubscription } = await import("./referrals");
    await grantReferrerRewardOnSubscription("referred-user");

    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });
});
