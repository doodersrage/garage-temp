import { createAdminClient, createServerClient } from "./supabase";
import { createStripeClient, isActiveSubscriptionStatus } from "./stripe";
import { getUserSubscription } from "./stripeSubscriptions";
import { notifyOps } from "./opsNotify";

// Deleting the account must not leave a live subscription billing someone who
// can no longer sign in to cancel it themselves. Cancel first; if Stripe is
// unreachable, alert ops so a human can cancel it manually rather than
// silently deleting the account with billing still running.
export async function cancelStripeSubscriptionForDeletedAccount(
  userId: string,
): Promise<void> {
  const subscription = await getUserSubscription(userId);
  if (!subscription || !isActiveSubscriptionStatus(subscription.status)) {
    return;
  }

  try {
    const stripe = createStripeClient();
    await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    await notifyOps(
      "ThermalTrace: Stripe cancellation failed during account deletion",
      `User ${userId} deleted their account but subscription ${subscription.stripe_subscription_id} could not be cancelled: ${message}. Cancel it manually in Stripe.`,
    );
  }
}

export async function deleteUserAccount(
  userId: string,
): Promise<{ error: string | null }> {
  await cancelStripeSubscriptionForDeletedAccount(userId);

  const supabase = createServerClient();

  // Remove owned households where user is sole owner (cascade deletes devices)
  const { data: owned } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .eq("role", "owner");

  for (const row of owned ?? []) {
    const { count } = await supabase
      .from("household_members")
      .select("id", { count: "exact", head: true })
      .eq("household_id", row.household_id);

    if ((count ?? 0) <= 1) {
      await supabase.from("households").delete().eq("id", row.household_id);
    } else {
      // This household has other members and this deleted account is its
      // only owner. Promote someone else to owner first -- otherwise the
      // household is left with members but no owner, and nobody can rename
      // it, manage billing, or invite/remove members afterward. Prefer an
      // existing "member" (already trusted with owner-level management),
      // falling back to whoever else has been in the household longest.
      const { data: candidates } = await supabase
        .from("household_members")
        .select("id, role, created_at")
        .eq("household_id", row.household_id)
        .neq("user_id", userId)
        .order("created_at", { ascending: true });

      const promotee =
        (candidates ?? []).find((member) => member.role === "member") ??
        candidates?.[0] ??
        null;

      if (promotee) {
        await supabase
          .from("household_members")
          .update({ role: "owner" })
          .eq("id", promotee.id);
      }

      await supabase
        .from("household_members")
        .delete()
        .eq("household_id", row.household_id)
        .eq("user_id", userId);
    }
  }

  await supabase.from("alert_settings").delete().eq("user_id", userId);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  return { error: error?.message ?? null };
}

export function resolveDataRetentionDays(
  userRetention: number | null | undefined,
  tier: "free" | "member" | "pro" | "admin",
): number {
  if (userRetention != null && userRetention >= 30) {
    return Math.min(userRetention, tier === "pro" || tier === "admin" ? 730 : 365);
  }
  if (tier === "pro" || tier === "admin") return 365;
  if (tier === "member") return 180;
  return 90;
}
