import type { APIRoute } from "astro";
import type Stripe from "stripe";
import { createStripeClient } from "../../../lib/stripe";
import {
  findUserIdByStripeSubscriptionId,
  upsertUserSubscription,
} from "../../../lib/stripeSubscriptions";
import { grantReferrerRewardOnSubscription } from "../../../lib/referrals";
import { claimStripeWebhookEvent } from "../../../lib/stripeWebhookEvents";

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      message:
        "Stripe webhook endpoint is active. Stripe delivers events here via POST.",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};

function getUserIdFromSubscription(
  subscription: Stripe.Subscription,
): string | null {
  return subscription.metadata.supabase_user_id ?? null;
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.client_reference_id ?? session.metadata?.supabase_user_id;

  if (!userId || !session.subscription || !session.customer) {
    return;
  }

  const stripe = createStripeClient();
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer.id;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await upsertUserSubscription(userId, subscription, customerId);

  const planTier =
    session.metadata?.plan_tier ?? subscription.metadata?.plan_tier;
  if (planTier === "pro") {
    await grantReferrerRewardOnSubscription(userId);
  }
}

async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
): Promise<void> {
  let userId = getUserIdFromSubscription(subscription);

  if (!userId) {
    userId = await findUserIdByStripeSubscriptionId(subscription.id);
  }

  if (!userId) {
    return;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  await upsertUserSubscription(userId, subscription, customerId);
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  await handleSubscriptionChange(subscription);
}

export const POST: APIRoute = async ({ request }) => {
  const signature = request.headers.get("stripe-signature");

  if (!signature || !import.meta.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Missing Stripe webhook configuration", { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;

  try {
    const stripe = createStripeClient();
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      import.meta.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid webhook signature";
    return new Response(message, { status: 400 });
  }

  const { alreadyProcessed } = await claimStripeWebhookEvent(event.id, event.type);
  if (alreadyProcessed) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook handler failed";
    return new Response(message, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
