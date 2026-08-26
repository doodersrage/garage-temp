export function resolvePlanTierFromPriceId(priceId: string | null | undefined): "member" | "pro" {
  const proMonthly = import.meta.env.STRIPE_PRICE_ID_PRO?.trim();
  const proAnnual = import.meta.env.STRIPE_PRICE_ID_PRO_ANNUAL?.trim();
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
  const memberMonthly = import.meta.env.STRIPE_PRICE_ID?.trim();
  const memberAnnual = import.meta.env.STRIPE_PRICE_ID_ANNUAL?.trim();
  const proMonthly = import.meta.env.STRIPE_PRICE_ID_PRO?.trim();
  const proAnnual = import.meta.env.STRIPE_PRICE_ID_PRO_ANNUAL?.trim();

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
