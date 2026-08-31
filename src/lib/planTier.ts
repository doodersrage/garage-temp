import { getRuntimeEnv } from "./runtimeEnv";

function cleanPriceId(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolvePlanTierFromPriceId(
  priceId: string | null | undefined,
): "member" | "pro" | "portfolio" {
  const portfolioMonthly = cleanPriceId(getRuntimeEnv("STRIPE_PRICE_ID_PORTFOLIO"));
  const portfolioAnnual = cleanPriceId(getRuntimeEnv("STRIPE_PRICE_ID_PORTFOLIO_ANNUAL"));
  if (
    priceId &&
    ((portfolioMonthly && priceId === portfolioMonthly) ||
      (portfolioAnnual && priceId === portfolioAnnual))
  ) {
    return "portfolio";
  }

  const proMonthly = cleanPriceId(getRuntimeEnv("STRIPE_PRICE_ID_PRO"));
  const proAnnual = cleanPriceId(getRuntimeEnv("STRIPE_PRICE_ID_PRO_ANNUAL"));
  if (
    priceId &&
    ((proMonthly && priceId === proMonthly) || (proAnnual && priceId === proAnnual))
  ) {
    return "pro";
  }
  return "member";
}

export function resolveStripePriceId(
  plan: "member" | "pro" | "portfolio",
  interval: "monthly" | "annual",
): string | undefined {
  const memberMonthly = cleanPriceId(getRuntimeEnv("STRIPE_PRICE_ID"));
  const memberAnnual = cleanPriceId(getRuntimeEnv("STRIPE_PRICE_ID_ANNUAL"));
  const proMonthly = cleanPriceId(getRuntimeEnv("STRIPE_PRICE_ID_PRO"));
  const proAnnual = cleanPriceId(getRuntimeEnv("STRIPE_PRICE_ID_PRO_ANNUAL"));
  const portfolioMonthly = cleanPriceId(getRuntimeEnv("STRIPE_PRICE_ID_PORTFOLIO"));
  const portfolioAnnual = cleanPriceId(getRuntimeEnv("STRIPE_PRICE_ID_PORTFOLIO_ANNUAL"));

  if (plan === "portfolio") {
    // Never fall back to pro/member prices -- that would charge the wrong amount
    // while metadata still says portfolio, and webhooks would resolve the tier
    // from the price id as pro/member.
    if (interval === "annual") {
      return portfolioAnnual || portfolioMonthly;
    }
    return portfolioMonthly;
  }

  if (plan === "pro") {
    if (interval === "annual") {
      return proAnnual || memberAnnual || proMonthly || memberMonthly;
    }
    return proMonthly || memberMonthly;
  }

  if (interval === "annual") {
    return memberAnnual || memberMonthly;
  }
  return memberMonthly;
}
