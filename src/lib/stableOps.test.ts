import { describe, expect, it, vi, beforeEach } from "vitest";

const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn(() => ({ insert: mockInsert }));
const mockOrder = vi.fn().mockReturnThis();
const mockLimit = vi.fn().mockResolvedValue({ data: [] });
const mockSelect = vi.fn(() => ({ order: mockOrder }));
mockOrder.mockReturnValue({ limit: mockLimit });

vi.mock("./supabase", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "server_errors") {
        return { insert: mockInsert };
      }
      return { select: mockSelect };
    },
  }),
}));

const notifyOps = vi.fn().mockResolvedValue(undefined);
vi.mock("./opsNotify", () => ({
  notifyOps,
}));

describe("serverErrors", () => {
  beforeEach(() => {
    mockInsert.mockClear();
    notifyOps.mockClear();
  });

  it("records error details and notifies ops", async () => {
    const { recordServerError } = await import("./serverErrors");
    const err = new Error("boom");
    err.stack = "Error: boom\n    at test.ts:1:1";

    await recordServerError({
      path: "/dashboard/history",
      method: "GET",
      error: err,
      userId: "user-1",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/dashboard/history",
        method: "GET",
        message: "boom",
        user_id: "user-1",
      }),
    );
    expect(notifyOps).toHaveBeenCalledWith(
      "Garage Temp page error: /dashboard/history",
      expect.stringContaining("boom"),
    );
  });

  it("truncates long paths and stringifies non-Error values", async () => {
    const { recordServerError } = await import("./serverErrors");
    await recordServerError({
      path: "/x".repeat(600),
      error: { code: "fail" },
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "[object Object]",
        stack: null,
      }),
    );
    expect(mockInsert.mock.calls[0]?.[0]?.path).toHaveLength(500);
  });
});

describe("stripePriceAudit", () => {
  it("builds audit rows from display env without Stripe", async () => {
    const env = import.meta.env as unknown as Record<string, string | undefined>;
    const prev = {
      key: env.STRIPE_SECRET_KEY,
      memberM: env.STRIPE_DISPLAY_MEMBER_MONTHLY,
      memberA: env.STRIPE_DISPLAY_MEMBER_ANNUAL,
      proM: env.STRIPE_DISPLAY_PRO_MONTHLY,
      proA: env.STRIPE_DISPLAY_PRO_ANNUAL,
    };

    env.STRIPE_SECRET_KEY = "";
    env.STRIPE_DISPLAY_MEMBER_MONTHLY = "6";
    env.STRIPE_DISPLAY_MEMBER_ANNUAL = "60";
    env.STRIPE_DISPLAY_PRO_MONTHLY = "12";
    env.STRIPE_DISPLAY_PRO_ANNUAL = "120";

    const { auditStripeDisplayPrices } = await import("./stripePriceAudit");
    const { rows } = await auditStripeDisplayPrices();

    expect(rows).toHaveLength(4);
    expect(rows.find((r) => r.plan === "member" && r.interval === "monthly")).toMatchObject({
      displayAmountUsd: 6,
      stripeAmountUsd: null,
      match: null,
    });

    env.STRIPE_SECRET_KEY = prev.key;
    env.STRIPE_DISPLAY_MEMBER_MONTHLY = prev.memberM;
    env.STRIPE_DISPLAY_MEMBER_ANNUAL = prev.memberA;
    env.STRIPE_DISPLAY_PRO_MONTHLY = prev.proM;
    env.STRIPE_DISPLAY_PRO_ANNUAL = prev.proA;
  });
});
