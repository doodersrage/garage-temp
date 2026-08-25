import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { createStripeClient, buildSiteUrl } from "../../../lib/stripe";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData().catch(() => null);
  const plan = formData?.get("plan")?.toString() === "pro" ? "pro" : "member";
  const memberPrice = import.meta.env.STRIPE_PRICE_ID?.trim();
  const proPrice = import.meta.env.STRIPE_PRICE_ID_PRO?.trim();
  const priceId = plan === "pro" ? proPrice || memberPrice : memberPrice;

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
        },
      },
      metadata: {
        supabase_user_id: user.id,
        plan_tier: plan,
      },
      success_url: buildSiteUrl(
        request,
        "/dashboard/history?subscription=success",
      ),
      cancel_url: buildSiteUrl(
        request,
        "/dashboard/history?subscription=cancelled",
      ),
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
