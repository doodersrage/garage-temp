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

describe("portfolio tier price mapping", () => {
  it("resolves a configured portfolio price id to the portfolio tier", () => {
    const env = import.meta.env as unknown as Record<string, string | undefined>;
    const prev = {
      portfolioM: env.STRIPE_PRICE_ID_PORTFOLIO,
      portfolioA: env.STRIPE_PRICE_ID_PORTFOLIO_ANNUAL,
    };
    env.STRIPE_PRICE_ID_PORTFOLIO = "price_portfolio_monthly";
    env.STRIPE_PRICE_ID_PORTFOLIO_ANNUAL = "price_portfolio_annual";

    expect(resolvePlanTierFromPriceId("price_portfolio_monthly")).toBe("portfolio");
    expect(resolvePlanTierFromPriceId("price_portfolio_annual")).toBe("portfolio");
    expect(resolvePlanTierFromPriceId("price_something_else")).toBe("member");

    env.STRIPE_PRICE_ID_PORTFOLIO = prev.portfolioM;
    env.STRIPE_PRICE_ID_PORTFOLIO_ANNUAL = prev.portfolioA;
  });

  it("resolveStripePriceId prefers a configured portfolio price without cross-tier fallback", () => {
    const env = import.meta.env as unknown as Record<string, string | undefined>;
    const prev = {
      portfolioM: env.STRIPE_PRICE_ID_PORTFOLIO,
      portfolioA: env.STRIPE_PRICE_ID_PORTFOLIO_ANNUAL,
      proM: env.STRIPE_PRICE_ID_PRO,
      proA: env.STRIPE_PRICE_ID_PRO_ANNUAL,
    };

    env.STRIPE_PRICE_ID_PORTFOLIO = "price_portfolio_monthly";
    env.STRIPE_PRICE_ID_PORTFOLIO_ANNUAL = "";
    env.STRIPE_PRICE_ID_PRO = "price_pro_monthly";
    env.STRIPE_PRICE_ID_PRO_ANNUAL = "price_pro_annual";

    expect(resolveStripePriceId("portfolio", "monthly")).toBe("price_portfolio_monthly");
    // Annual unset -- fall back to portfolio monthly only (same tier).
    expect(resolveStripePriceId("portfolio", "annual")).toBe("price_portfolio_monthly");

    env.STRIPE_PRICE_ID_PORTFOLIO = "";
    env.STRIPE_PRICE_ID_PORTFOLIO_ANNUAL = "";
    expect(resolveStripePriceId("portfolio", "monthly")).toBeUndefined();
    expect(resolveStripePriceId("portfolio", "annual")).toBeUndefined();

    env.STRIPE_PRICE_ID_PORTFOLIO = prev.portfolioM;
    env.STRIPE_PRICE_ID_PORTFOLIO_ANNUAL = prev.portfolioA;
    env.STRIPE_PRICE_ID_PRO = prev.proM;
    env.STRIPE_PRICE_ID_PRO_ANNUAL = prev.proA;
  });
});
