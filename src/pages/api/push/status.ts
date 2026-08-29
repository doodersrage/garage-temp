import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getUserEntitlements } from "../../../lib/entitlements";
import { countFcmTokens, isFcmConfigured } from "../../../lib/fcm";
import { getAlertSettingsForUser } from "../../../lib/notify";
import { countPushSubscriptions, isVapidConfigured } from "../../../lib/webPush";

export const GET: APIRoute = async ({ cookies }) => {
  const { user } = await getAuthFromCookies(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [entitlements, settings, subscriptionCount, fcmTokenCount] = await Promise.all([
    getUserEntitlements(user.id),
    getAlertSettingsForUser(user.id, user.user_metadata as Record<string, unknown>),
    countPushSubscriptions(user.id),
    countFcmTokens(user.id),
  ]);

  const vapidConfigured = isVapidConfigured();
  const fcmConfigured = isFcmConfigured();
  const deviceCount = subscriptionCount + fcmTokenCount;

  return new Response(
    JSON.stringify({
      canUsePush: entitlements.canUsePush,
      vapidConfigured,
      fcmConfigured,
      channelEnabled: settings.channelPush,
      subscriptionCount,
      fcmTokenCount,
      deviceCount,
      ready:
        entitlements.canUsePush &&
        settings.channelPush &&
        deviceCount > 0 &&
        (vapidConfigured || fcmConfigured),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};
