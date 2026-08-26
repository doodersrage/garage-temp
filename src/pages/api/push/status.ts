import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getUserEntitlements } from "../../../lib/entitlements";
import { countPushSubscriptions } from "../../../lib/webPush";
import { getAlertSettingsForUser } from "../../../lib/notify";

export const GET: APIRoute = async ({ cookies }) => {
  const { user } = await getAuthFromCookies(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [entitlements, settings, subscriptionCount] = await Promise.all([
    getUserEntitlements(user.id),
    getAlertSettingsForUser(user.id, user.user_metadata as Record<string, unknown>),
    countPushSubscriptions(user.id),
  ]);

  const vapidConfigured = Boolean(
    import.meta.env.VAPID_PUBLIC_KEY && import.meta.env.VAPID_PRIVATE_KEY,
  );

  return new Response(
    JSON.stringify({
      canUsePush: entitlements.canUsePush,
      vapidConfigured,
      channelEnabled: settings.channelPush,
      subscriptionCount,
      ready:
        entitlements.canUsePush &&
        vapidConfigured &&
        settings.channelPush &&
        subscriptionCount > 0,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};
