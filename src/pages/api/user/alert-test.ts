import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getAlertSettingsForUser, markCooldown, notifyUser } from "../../../lib/notify";

import {
  redirectUnlessEditor,
  requireHouseholdEditor,
} from "../../../lib/householdAuth";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard/alerts";

  const editor = await requireHouseholdEditor(user.id);
  const blocked = redirectUnlessEditor(editor, redirectTo, redirect);
  if (blocked) return blocked;

  try {
    const settings = await getAlertSettingsForUser(
      user.id,
      user.user_metadata as Record<string, unknown>,
    );

    const { sent, skipped } = await notifyUser(user.id, user.email, settings, {
      title: "Garage Temp test alert",
      body: "This is a test notification from your Garage Temperature Monitor dashboard. If you received this, your alert channels are working.",
      kind: "generic",
    });

    if (sent.length === 0) {
      const reason = skipped.length > 0 ? "incomplete" : "none";
      return redirect(`${redirectTo}?test_error=1&test_reason=${reason}`);
    }

    await markCooldown(user.id, "last_alert_sent_at");

    const params = new URLSearchParams({ test_sent: "1", sent: sent.join(",") });
    if (skipped.length > 0) params.set("skipped", skipped.join(","));
    return redirect(`${redirectTo}?${params.toString()}`);
  } catch (error) {
    console.error("Test alert failed:", error);
    return redirect(`${redirectTo}?test_error=1`);
  }
};
