import Stripe from "stripe";
import { resolveConfiguredSiteUrl } from "./siteConfig";

let stripeClient: Stripe | null = null;

export function createStripeClient(): Stripe {
  if (!import.meta.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
      httpClient: Stripe.createFetchHttpClient(),
    });
  }

  return stripeClient;
}

export function getSiteUrl(request: Request): string {
  const fromEnv =
    import.meta.env.SITE_URL?.trim() ||
    import.meta.env.ORIGIN?.trim();

  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return resolveConfiguredSiteUrl();
  }
}

export function buildSiteUrl(request: Request, path: string): string {
  const base = getSiteUrl(request);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, `${base}/`).toString();
}

export function isActiveSubscriptionStatus(status: string): boolean {
  return status === "active" || status === "trialing";
}
