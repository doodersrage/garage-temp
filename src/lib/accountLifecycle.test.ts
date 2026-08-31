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

function mockQuery(result: { data?: unknown; count?: number; error?: unknown }) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "neq", "order", "insert", "update", "delete"]) {
    builder[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    });
  }
  (builder as { then: unknown }).then = (
    resolve: (value: unknown) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  (builder as { calls: Array<{ method: string; args: unknown[] }> }).calls = calls;
  return builder as unknown as Record<string, unknown> & {
    calls: Array<{ method: string; args: unknown[] }>;
  };
}

const mockFrom = vi.fn();
const mockDeleteUser = vi.fn().mockResolvedValue({ error: null });
vi.mock("./supabase", () => ({
  createServerClient: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
  createAdminClient: () => ({ auth: { admin: { deleteUser: mockDeleteUser } } }),
}));

beforeEach(() => {
  mockGetUserSubscription.mockReset();
  mockCancel.mockClear();
  mockNotifyOps.mockClear();
  mockFrom.mockReset();
  mockDeleteUser.mockClear().mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("cancelStripeSubscriptionForDeletedAccount", () => {
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

describe("deleteUserAccount", () => {
  beforeEach(() => {
    mockGetUserSubscription.mockResolvedValue(null);
  });

  it("deletes the household outright when the departing owner is its only member", async () => {
    const ownedQuery = mockQuery({ data: [{ household_id: "h1" }] });
    const countQuery = mockQuery({ count: 1 });
    const householdsDeleteQuery = mockQuery({ error: null });
    const alertSettingsQuery = mockQuery({ error: null });
    mockFrom
      .mockReturnValueOnce(ownedQuery) // select owned households
      .mockReturnValueOnce(countQuery) // count members in h1
      .mockReturnValueOnce(householdsDeleteQuery) // households.delete
      .mockReturnValueOnce(alertSettingsQuery); // alert_settings.delete

    const { deleteUserAccount } = await import("./accountLifecycle");
    const result = await deleteUserAccount("user-1");

    expect(result.error).toBeNull();
    expect(mockFrom.mock.calls.map((c) => c[0])).toEqual([
      "household_members",
      "household_members",
      "households",
      "alert_settings",
    ]);
    expect(householdsDeleteQuery.calls).toContainEqual({ method: "eq", args: ["id", "h1"] });
    expect(mockDeleteUser).toHaveBeenCalledWith("user-1");
  });

  it("promotes an existing member to owner before removing the sole owner from a shared household", async () => {
    const ownedQuery = mockQuery({ data: [{ household_id: "h1" }] });
    const countQuery = mockQuery({ count: 3 });
    const candidatesQuery = mockQuery({
      data: [
        { id: "m-viewer", role: "viewer", created_at: "2026-01-01" },
        { id: "m-member", role: "member", created_at: "2026-01-02" },
      ],
    });
    const updateQuery = mockQuery({ error: null });
    const removeOwnerQuery = mockQuery({ error: null });
    const alertSettingsQuery = mockQuery({ error: null });
    mockFrom
      .mockReturnValueOnce(ownedQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(candidatesQuery)
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce(removeOwnerQuery)
      .mockReturnValueOnce(alertSettingsQuery);

    const { deleteUserAccount } = await import("./accountLifecycle");
    await deleteUserAccount("user-1");

    // Prefers the "member" role even though the viewer was added first.
    expect(updateQuery.calls[0]).toEqual({ method: "update", args: [{ role: "owner" }] });
    expect(updateQuery.calls).toContainEqual({ method: "eq", args: ["id", "m-member"] });
    expect(removeOwnerQuery.calls).toContainEqual({
      method: "eq",
      args: ["household_id", "h1"],
    });
    expect(removeOwnerQuery.calls).toContainEqual({ method: "eq", args: ["user_id", "user-1"] });
  });

  it("falls back to the longest-tenured remaining member when nobody has the member role", async () => {
    const ownedQuery = mockQuery({ data: [{ household_id: "h1" }] });
    const countQuery = mockQuery({ count: 2 });
    const candidatesQuery = mockQuery({
      data: [{ id: "m-viewer", role: "viewer", created_at: "2026-01-01" }],
    });
    const updateQuery = mockQuery({ error: null });
    const removeOwnerQuery = mockQuery({ error: null });
    const alertSettingsQuery = mockQuery({ error: null });
    mockFrom
      .mockReturnValueOnce(ownedQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(candidatesQuery)
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce(removeOwnerQuery)
      .mockReturnValueOnce(alertSettingsQuery);

    const { deleteUserAccount } = await import("./accountLifecycle");
    await deleteUserAccount("user-1");

    expect(updateQuery.calls).toContainEqual({ method: "eq", args: ["id", "m-viewer"] });
  });

  it("skips promotion cleanly when no other member is found", async () => {
    const ownedQuery = mockQuery({ data: [{ household_id: "h1" }] });
    const countQuery = mockQuery({ count: 2 });
    const candidatesQuery = mockQuery({ data: [] });
    const removeOwnerQuery = mockQuery({ error: null });
    const alertSettingsQuery = mockQuery({ error: null });
    mockFrom
      .mockReturnValueOnce(ownedQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(candidatesQuery)
      .mockReturnValueOnce(removeOwnerQuery)
      .mockReturnValueOnce(alertSettingsQuery);

    const { deleteUserAccount } = await import("./accountLifecycle");
    const result = await deleteUserAccount("user-1");

    expect(result.error).toBeNull();
    // No update() call happened -- only 5 .from() calls total, not 6.
    expect(mockFrom).toHaveBeenCalledTimes(5);
  });
});
