import { createAdminClient } from "./supabase";

export type WebPushPayload = {
  title: string;
  body: string;
};

export type WebPushDeliveryResult = {
  delivered: number;
  failed: number;
  skippedReason: string | null;
};

export function isStalePushStatus(status: number): boolean {
  return status === 404 || status === 410;
}

export async function sendWebPushToUser(
  userId: string,
  payload: WebPushPayload,
): Promise<WebPushDeliveryResult> {
  const publicKey = import.meta.env.VAPID_PUBLIC_KEY;
  const privateKey = import.meta.env.VAPID_PRIVATE_KEY;
  const subject = import.meta.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

  if (!publicKey || !privateKey) {
    return { delivered: 0, failed: 0, skippedReason: "push_not_configured" };
  }

  const supabase = createAdminClient();
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to load push subscriptions:", error.message);
    return { delivered: 0, failed: 0, skippedReason: "push_load_failed" };
  }

  if (!subs || subs.length === 0) {
    return { delivered: 0, failed: 0, skippedReason: "push_no_subscription" };
  }

  let delivered = 0;
  let failed = 0;

  try {
    const { buildPushPayload } = await import("@block65/webcrypto-web-push");
    const pushBody = JSON.stringify({
      title: payload.title,
      body: payload.body,
    });

    for (const sub of subs) {
      try {
        const pushPayload = await buildPushPayload(
          {
            data: pushBody,
            options: { ttl: 60 * 60, urgency: "high" },
          },
          {
            endpoint: sub.endpoint,
            expirationTime: null,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          {
            subject,
            publicKey,
            privateKey,
          },
        );

        const response = await fetch(sub.endpoint, pushPayload);
        if (response.ok) {
          delivered += 1;
          continue;
        }

        failed += 1;
        console.error(
          "Web push endpoint rejected:",
          sub.endpoint,
          response.status,
          await response.text().catch(() => ""),
        );

        if (isStalePushStatus(response.status)) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", userId)
            .eq("endpoint", sub.endpoint);
        }
      } catch (error) {
        failed += 1;
        console.error("Web push send failed:", error);
      }
    }
  } catch (error) {
    console.error("Web push library unavailable:", error);
    return { delivered: 0, failed: subs.length, skippedReason: "push_send_failed" };
  }

  if (delivered > 0) {
    return { delivered, failed, skippedReason: null };
  }

  return {
    delivered: 0,
    failed,
    skippedReason: failed > 0 ? "push_delivery_failed" : "push_no_subscription",
  };
}

export async function countPushSubscriptions(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to count push subscriptions:", error.message);
    return 0;
  }

  return count ?? 0;
}
