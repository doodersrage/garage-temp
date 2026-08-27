import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { isUserAdmin } from "../../../lib/adminAccess";
import {
  getAlertSettingsForUser,
  isTwilioConfigured,
  sendTwilioSms,
} from "../../../lib/notify";
import { isVapidConfigured, sendWebPushToUser } from "../../../lib/webPush";

export const POST: APIRoute = async ({ request, cookies }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user || !(await isUserAdmin(user.id))) {
    return new Response("Forbidden", { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  const kind = formData?.get("kind")?.toString() ?? "sms";

  if (kind === "sms") {
    if (!isTwilioConfigured()) {
      return new Response("Twilio is not configured", { status: 503 });
    }

    const settings = await getAlertSettingsForUser(
      user.id,
      user.user_metadata as Record<string, unknown>,
    );
    const phone =
      formData?.get("phone")?.toString().trim() || settings.smsPhone || null;
    if (!phone) {
      return new Response("No SMS phone on alert settings or form", {
        status: 400,
      });
    }

    const ok = await sendTwilioSms(
      phone,
      "[Test] Garage Temp SMS channel smoke test",
    );
    if (!ok) {
      return new Response("Twilio SMS send failed", { status: 500 });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: "/dashboard/ops?channel_test=1" },
    });
  }

  if (kind === "push") {
    if (!isVapidConfigured()) {
      return new Response("VAPID keys are not configured", { status: 503 });
    }

    const result = await sendWebPushToUser(user.id, {
      title: "[Test] Garage Temp push",
      body: "Channel smoke test — browser push is working.",
    });

    if (result.delivered <= 0) {
      return new Response(
        result.skippedReason ?? "Push delivery failed (subscribe this browser first)",
        { status: 500 },
      );
    }

    return new Response(null, {
      status: 302,
      headers: { Location: "/dashboard/ops?channel_test=1" },
    });
  }

  return new Response("Unknown kind (use sms or push)", { status: 400 });
};
