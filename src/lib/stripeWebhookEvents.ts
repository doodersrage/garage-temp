import { createServerClient } from "./supabase";

/**
 * Stripe delivers webhook events at-least-once, so retries and rare duplicate
 * deliveries are expected and explicitly documented by Stripe. This records
 * each event id before processing so a duplicate delivery is a no-op instead
 * of re-running side effects (subscription sync, referral reward grants) a
 * second time.
 */
export async function claimStripeWebhookEvent(
  eventId: string,
  eventType: string,
): Promise<{ alreadyProcessed: boolean }> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("stripe_webhook_events")
    .insert({ id: eventId, type: eventType });

  if (!error) {
    return { alreadyProcessed: false };
  }

  // 23505 = unique_violation: this event id was already recorded (and handled).
  if (error.code === "23505") {
    return { alreadyProcessed: true };
  }

  // Any other DB error: fail open rather than silently dropping a real event.
  // Losing dedup once during a rare DB hiccup is far cheaper than dropping a
  // subscription or payment event outright.
  console.error("Failed to record Stripe webhook event id:", error.message);
  return { alreadyProcessed: false };
}

/**
 * Release a claimed event id so Stripe can retry after a handler failure.
 * Without this, a 500 after a successful claim would permanently drop the event.
 */
export async function releaseStripeWebhookEvent(eventId: string): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("stripe_webhook_events")
    .delete()
    .eq("id", eventId);

  if (error) {
    console.error("Failed to release Stripe webhook event id:", error.message);
  }
}
