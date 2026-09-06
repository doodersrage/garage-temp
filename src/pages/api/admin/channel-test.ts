import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { isUserAdmin } from "../../../lib/adminAccess";
import {
  getAlertSettingsForUser,
  isTwilioConfigured,
  sendTwilioSms,
} from "../../../lib/notify";
import { isVapidConfigured, sendWebPushToUser } from "../../../lib/webPush";

function opsRedirect(params: Record<string, string>): Response {
  const qs = new URLSearchParams(params);
  return new Response(null, {
    status: 302,
    headers: { Location: `/dashboard/ops?${qs.toString()}` },
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user || !(await isUserAdmin(user.id))) {
    return new Response("Forbidden", { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  const kind = formData?.get("kind")?.toString() ?? "sms";

  if (kind === "sms") {
    if (!isTwilioConfigured()) {
      return opsRedirect({ channel_error: "sms_not_configured" });
    }

    const settings = await getAlertSettingsForUser(
      user.id,
      user.user_metadata as Record<string, unknown>,
    );
    const phone =
      formData?.get("phone")?.toString().trim() || settings.smsPhone || null;
    if (!phone) {
      return opsRedirect({ channel_error: "sms_no_phone" });
    }

    const ok = await sendTwilioSms(
      phone,
      "[Test] ThermalTrace SMS channel smoke test",
    );
    if (!ok) {
      return opsRedirect({ channel_error: "sms_send_failed" });
    }

    return opsRedirect({ channel_test: "1", channel_kind: "sms" });
  }

  if (kind === "push") {
    if (!isVapidConfigured()) {
      return opsRedirect({ channel_error: "push_not_configured" });
    }

    const result = await sendWebPushToUser(user.id, {
      title: "[Test] ThermalTrace push",
      body: "Channel smoke test: browser push is working.",
    });

    if (result.delivered <= 0) {
      const reason = result.skippedReason ?? "push_delivery_failed";
      return opsRedirect({ channel_error: reason });
    }

    return opsRedirect({ channel_test: "1", channel_kind: "push" });
  }

  return opsRedirect({ channel_error: "unknown_kind" });
};
