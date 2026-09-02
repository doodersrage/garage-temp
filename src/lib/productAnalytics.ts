/** GA4-friendly conversion / product events (client gtag). */

export type GaConversionEvent =
  | "sign_up"
  | "login"
  | "generate_lead"
  | "begin_checkout"
  | "purchase"
  | "view_item_list"
  | "select_item";

export type ProductEvent =
  | GaConversionEvent
  | "onboarding_step_complete"
  | "first_ingest"
  | "first_alert_test"
  | "alert_essentials_saved"
  | "family_share_created"
  | "device_created"
  | "pull_setup_saved"
  | "sensors_renamed"
  | "demo_pull_started"
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

/** Paths where we allow GA even under /dashboard for post-checkout attribution. */
export function isDashboardConversionPath(
  pathname: string,
  searchParams?: URLSearchParams | string,
): boolean {
  if (!pathname.startsWith("/dashboard")) return false;
  const params =
    typeof searchParams === "string"
      ? new URLSearchParams(searchParams)
      : searchParams;
  return params?.get("subscription") === "success";
}
