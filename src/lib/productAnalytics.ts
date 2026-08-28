/** Lightweight product analytics — opt-in Plausible-style events via GA4 or console. */

export type ProductEvent =
  | "onboarding_step_complete"
  | "first_ingest"
  | "first_alert_test"
  | "mfa_enrolled"
  | "account_deleted"
  | "portfolio_view";

export function trackProductEvent(
  name: ProductEvent,
  props?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") return;

  const payload = { event: name, ...props };

  if (import.meta.env.DEV) {
    console.debug("[product-analytics]", payload);
  }

  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === "function") {
    gtag("event", name, props ?? {});
  }
}

export function shouldTrackProductAnalytics(
  metadata?: Record<string, unknown>,
): boolean {
  if (metadata?.product_analytics_opt_out === true) return false;
  return import.meta.env.PROD;
}
