export function resolvePlanTierFromPriceId(priceId: string | null | undefined): "member" | "pro" {
  const proPrice = import.meta.env.STRIPE_PRICE_ID_PRO;
  if (proPrice && priceId && priceId === proPrice) {
    return "pro";
  }
  return "member";
}
