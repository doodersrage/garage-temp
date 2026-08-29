import { getRuntimeEnv } from "./runtimeEnv";

function cleanPriceId(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolvePlanTierFromPriceId(priceId: string | null | undefined): "member" | "pro" {
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
  plan: "member" | "pro",
  interval: "monthly" | "annual",
): string | undefined {
  const memberMonthly = cleanPriceId(getRuntimeEnv("STRIPE_PRICE_ID"));
  const memberAnnual = cleanPriceId(getRuntimeEnv("STRIPE_PRICE_ID_ANNUAL"));
  const proMonthly = cleanPriceId(getRuntimeEnv("STRIPE_PRICE_ID_PRO"));
  const proAnnual = cleanPriceId(getRuntimeEnv("STRIPE_PRICE_ID_PRO_ANNUAL"));

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
