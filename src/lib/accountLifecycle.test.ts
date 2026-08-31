import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUserSubscription = vi.fn();
vi.mock("./stripeSubscriptions", () => ({
  getUserSubscription: mockGetUserSubscription,
}));

const mockCancel = vi.fn().mockResolvedValue({});
vi.mock("./stripe", () => ({
  createStripeClient: () => ({ subscriptions: { cancel: mockCancel } }),
  isActiveSubscriptionStatus: (status: string) =>
    status === "active" || status === "trialing",
}));

const mockNotifyOps = vi.fn().mockResolvedValue(undefined);
vi.mock("./opsNotify", () => ({
  notifyOps: mockNotifyOps,
}));

describe("cancelStripeSubscriptionForDeletedAccount", () => {
  beforeEach(() => {
    mockGetUserSubscription.mockReset();
    mockCancel.mockClear();
    mockNotifyOps.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does nothing when the user has no subscription", async () => {
    mockGetUserSubscription.mockResolvedValue(null);
    const { cancelStripeSubscriptionForDeletedAccount } = await import("./accountLifecycle");

    await cancelStripeSubscriptionForDeletedAccount("user-1");

    expect(mockCancel).not.toHaveBeenCalled();
    expect(mockNotifyOps).not.toHaveBeenCalled();
  });

  it("does nothing when the subscription is already inactive", async () => {
    mockGetUserSubscription.mockResolvedValue({
      stripe_subscription_id: "sub_1",
      status: "canceled",
    });
    const { cancelStripeSubscriptionForDeletedAccount } = await import("./accountLifecycle");

    await cancelStripeSubscriptionForDeletedAccount("user-1");

    expect(mockCancel).not.toHaveBeenCalled();
  });

  it("cancels an active subscription", async () => {
    mockGetUserSubscription.mockResolvedValue({
      stripe_subscription_id: "sub_active",
      status: "active",
    });
    const { cancelStripeSubscriptionForDeletedAccount } = await import("./accountLifecycle");

    await cancelStripeSubscriptionForDeletedAccount("user-1");

    expect(mockCancel).toHaveBeenCalledWith("sub_active");
    expect(mockNotifyOps).not.toHaveBeenCalled();
  });

  it("cancels a trialing subscription", async () => {
    mockGetUserSubscription.mockResolvedValue({
      stripe_subscription_id: "sub_trial",
      status: "trialing",
    });
    const { cancelStripeSubscriptionForDeletedAccount } = await import("./accountLifecycle");

    await cancelStripeSubscriptionForDeletedAccount("user-1");

    expect(mockCancel).toHaveBeenCalledWith("sub_trial");
  });

  it("alerts ops instead of throwing when Stripe cancellation fails", async () => {
    mockGetUserSubscription.mockResolvedValue({
      stripe_subscription_id: "sub_broken",
      status: "active",
    });
    mockCancel.mockRejectedValueOnce(new Error("Stripe unreachable"));
    const { cancelStripeSubscriptionForDeletedAccount } = await import("./accountLifecycle");

    await expect(
      cancelStripeSubscriptionForDeletedAccount("user-1"),
    ).resolves.toBeUndefined();

    expect(mockNotifyOps).toHaveBeenCalledWith(
      expect.stringContaining("Stripe cancellation failed"),
      expect.stringContaining("sub_broken"),
    );
  });
});
