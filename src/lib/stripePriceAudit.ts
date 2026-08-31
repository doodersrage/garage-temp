import { getRuntimeEnv } from "./runtimeEnv";
import { createStripeClient } from "./stripe";
import {
  getMemberPriceDisplay,
  getPortfolioPriceDisplay,
  getProPriceDisplay,
  type PlanPriceDisplay,
} from "./stripePricing";
import { resolveStripePriceId } from "./planTier";

export type StripePriceAuditPlan = "member" | "pro" | "portfolio";

export type StripePriceAuditRow = {
  plan: StripePriceAuditPlan;
  interval: "monthly" | "annual";
  priceId: string | null;
  stripeAmountUsd: number | null;
  displayAmountUsd: number | null;
  match: boolean | null;
};

function parseEnvAmount(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const value = Number(raw.trim());
  return Number.isFinite(value) && value > 0 ? value : null;
}

function displayEnvAmount(
  plan: StripePriceAuditPlan,
  interval: "monthly" | "annual",
): number | null {
  if (plan === "member") {
    return interval === "annual"
      ? parseEnvAmount(getRuntimeEnv("STRIPE_DISPLAY_MEMBER_ANNUAL"))
      : parseEnvAmount(getRuntimeEnv("STRIPE_DISPLAY_MEMBER_MONTHLY"));
  }
  if (plan === "portfolio") {
    return interval === "annual"
      ? parseEnvAmount(getRuntimeEnv("STRIPE_DISPLAY_PORTFOLIO_ANNUAL"))
      : parseEnvAmount(getRuntimeEnv("STRIPE_DISPLAY_PORTFOLIO_MONTHLY"));
  }
  return interval === "annual"
    ? parseEnvAmount(getRuntimeEnv("STRIPE_DISPLAY_PRO_ANNUAL"))
    : parseEnvAmount(getRuntimeEnv("STRIPE_DISPLAY_PRO_MONTHLY"));
}

export async function auditStripeDisplayPrices(): Promise<{
  rows: StripePriceAuditRow[];
  configured: {
    member: PlanPriceDisplay;
    pro: PlanPriceDisplay;
    portfolio: PlanPriceDisplay;
  };
}> {
  const configured = {
    member: getMemberPriceDisplay(),
    pro: getProPriceDisplay(),
    portfolio: getPortfolioPriceDisplay(),
  };

  const combos: Array<{
    plan: StripePriceAuditPlan;
    interval: "monthly" | "annual";
  }> = [
    { plan: "member", interval: "monthly" },
    { plan: "member", interval: "annual" },
    { plan: "pro", interval: "monthly" },
    { plan: "pro", interval: "annual" },
    { plan: "portfolio", interval: "monthly" },
    { plan: "portfolio", interval: "annual" },
  ];

  let stripe: ReturnType<typeof createStripeClient> | null = null;
  try {
    if (getRuntimeEnv("STRIPE_SECRET_KEY")?.startsWith("sk_")) {
      stripe = createStripeClient();
    }
  } catch {
    stripe = null;
  }

  const rows: StripePriceAuditRow[] = [];

  for (const { plan, interval } of combos) {
    const priceId = resolveStripePriceId(plan, interval) ?? null;
    const displayAmountUsd = displayEnvAmount(plan, interval);
    let stripeAmountUsd: number | null = null;

    if (stripe && priceId?.startsWith("price_")) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        if (typeof price.unit_amount === "number") {
          stripeAmountUsd = price.unit_amount / 100;
        }
      } catch {
        stripeAmountUsd = null;
      }
    }

    const match =
      stripeAmountUsd != null && displayAmountUsd != null
        ? Math.abs(stripeAmountUsd - displayAmountUsd) < 0.01
        : null;

    rows.push({
      plan,
      interval,
      priceId,
      stripeAmountUsd,
      displayAmountUsd,
      match,
    });
  }

  return { rows, configured };
}
