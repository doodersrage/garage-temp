import Stripe from "stripe";

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
  return import.meta.env.SITE_URL ?? new URL(request.url).origin;
}

export function isActiveSubscriptionStatus(status: string): boolean {
  return status === "active" || status === "trialing";
}
