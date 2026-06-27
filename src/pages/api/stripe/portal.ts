import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { createStripeClient, buildSiteUrl } from "../../../lib/stripe";
import { getUserSubscription } from "../../../lib/stripeSubscriptions";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    return redirect("/signin");
  }

  const subscription = await getUserSubscription(user.id);

  if (!subscription?.stripe_customer_id) {
    return redirect("/dashboard/history?subscription=missing");
  }

  try {
    const stripe = createStripeClient();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: buildSiteUrl(request, "/dashboard/history"),
    });

    return redirect(portalSession.url);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to open billing portal";
    return new Response(message, { status: 500 });
  }
};
