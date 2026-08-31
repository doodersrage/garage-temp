import { describe, expect, it } from "vitest";

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

    expect(rows).toHaveLength(6);
    expect(rows.find((r) => r.plan === "member" && r.interval === "monthly")).toMatchObject({
      displayAmountUsd: 6,
      stripeAmountUsd: null,
      match: null,
    });
    expect(rows.some((r) => r.plan === "portfolio")).toBe(true);

    env.STRIPE_SECRET_KEY = prev.key;
    env.STRIPE_DISPLAY_MEMBER_MONTHLY = prev.memberM;
    env.STRIPE_DISPLAY_MEMBER_ANNUAL = prev.memberA;
    env.STRIPE_DISPLAY_PRO_MONTHLY = prev.proM;
    env.STRIPE_DISPLAY_PRO_ANNUAL = prev.proA;
  });
});
