import { describe, expect, it } from "vitest";
import { resolvePlanTierFromPriceId, resolveStripePriceId } from "./planTier";

describe("annual stripe price mapping", () => {
  it("defaults unknown price ids to member", () => {
    expect(resolvePlanTierFromPriceId("price_unknown")).toBe("member");
  });

  it("resolveStripePriceId falls back when annual unset", () => {
    const env = import.meta.env as unknown as Record<string, string | undefined>;
    const prev = {
      memberM: env.STRIPE_PRICE_ID,
      memberA: env.STRIPE_PRICE_ID_ANNUAL,
      proM: env.STRIPE_PRICE_ID_PRO,
      proA: env.STRIPE_PRICE_ID_PRO_ANNUAL,
    };
    env.STRIPE_PRICE_ID = "";
    env.STRIPE_PRICE_ID_ANNUAL = "";
    env.STRIPE_PRICE_ID_PRO = "";
    env.STRIPE_PRICE_ID_PRO_ANNUAL = "";

    expect(resolveStripePriceId("member", "monthly")).toBeUndefined();
    expect(resolveStripePriceId("member", "annual")).toBeUndefined();

    env.STRIPE_PRICE_ID = prev.memberM;
    env.STRIPE_PRICE_ID_ANNUAL = prev.memberA;
    env.STRIPE_PRICE_ID_PRO = prev.proM;
    env.STRIPE_PRICE_ID_PRO_ANNUAL = prev.proA;
  });
});
