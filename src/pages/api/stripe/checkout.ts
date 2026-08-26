import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { createStripeClient, buildSiteUrl } from "../../../lib/stripe";
import { resolveStripePriceId } from "../../../lib/planTier";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData().catch(() => null);
  const plan = formData?.get("plan")?.toString() === "pro" ? "pro" : "member";
  const interval =
    formData?.get("interval")?.toString() === "annual" ? "annual" : "monthly";
  const priceId = resolveStripePriceId(plan, interval);

  if (!priceId) {
    return new Response("Stripe price is not configured", { status: 500 });
  }

  if (!priceId.startsWith("price_")) {
    return new Response(
      "Stripe price IDs must start with price_.",
      { status: 500 },
    );
  }

  try {
    const stripe = createStripeClient();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_tier: plan,
          billing_interval: interval,
        },
        trial_period_days: plan === "pro" ? 14 : undefined,
      },
      metadata: {
        supabase_user_id: user.id,
        plan_tier: plan,
        billing_interval: interval,
      },
      success_url: buildSiteUrl(
        request,
        "/dashboard/history?subscription=success",
      ),
      cancel_url: buildSiteUrl(
        request,
        "/dashboard/history?subscription=cancelled",
      ),
      allow_promotion_codes: true,
    });

    if (!checkoutSession.url) {
      return new Response("Unable to create checkout session", { status: 500 });
    }

    return redirect(checkoutSession.url);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start checkout";
    return new Response(message, { status: 500 });
  }
};
