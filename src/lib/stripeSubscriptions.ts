import type Stripe from "stripe";
import { createServerClient } from "./supabase";
import { isActiveSubscriptionStatus } from "./stripe";

export type UserSubscription = {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: string;
  current_period_end: string | null;
};

export async function getUserSubscription(
  userId: string,
): Promise<UserSubscription | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("stripe_subscriptions")
    .select(
      "user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as UserSubscription;
}

export async function upsertUserSubscription(
  userId: string,
  subscription: Stripe.Subscription,
  customerId: string,
): Promise<{ error: string | null }> {
  const supabase = createServerClient();
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
  const { error } = await supabase.from("stripe_subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_end: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { error: error.message };
  }

  return syncMemberGroupForUser(userId, subscription.status);
}

export async function syncMemberGroupForUser(
  userId: string,
  status: string,
): Promise<{ error: string | null }> {
  const supabase = createServerClient();
  const { error } = await supabase.rpc("sync_member_group_membership", {
    target_user_id: userId,
    is_active: isActiveSubscriptionStatus(status),
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function findUserIdByStripeSubscriptionId(
  subscriptionId: string,
): Promise<string | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("stripe_subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.user_id;
}
