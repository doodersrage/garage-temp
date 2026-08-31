import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getAlertSettingsForUser, markCooldown, notifyUser } from "../../../lib/notify";
import {
  redirectUnlessEditor,
  requireHouseholdEditor,
} from "../../../lib/householdAuth";
import { formRedirectPath } from "../../../lib/siteUrl";

function wantsJson(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("application/json");
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  const json = wantsJson(request);

  if (!session || !user) {
    if (json) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return redirect("/signin");
  }

  let redirectTo = "/dashboard/alerts";
  const contentType = request.headers.get("content-type") ?? "";
  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    const formData = await request.formData();
    redirectTo = formRedirectPath(formData, redirectTo);
  }

  const editor = await requireHouseholdEditor(user.id);
  if (!editor.ok) {
    if (json) {
      return new Response(JSON.stringify({ error: "Editor role required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    const blocked = redirectUnlessEditor(editor, redirectTo, redirect);
    if (blocked) return blocked;
  }

  try {
    const settings = await getAlertSettingsForUser(
      user.id,
      user.user_metadata as Record<string, unknown>,
    );

    const { sent, skipped } = await notifyUser(user.id, user.email, settings, {
      title: "ThermalTrace test alert",
      body: "This is a test notification from your ThermalTrace dashboard. If you received this, your alert channels are working.",
      kind: "generic",
    });

    if (sent.length === 0) {
      const reason = skipped.length > 0 ? "incomplete" : "none";
      if (json) {
        return new Response(
          JSON.stringify({ ok: false, error: "No channels delivered", reason, skipped }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return redirect(`${redirectTo}?test_error=1&test_reason=${reason}`);
    }

    await markCooldown(user.id, "last_alert_sent_at");

    if (json) {
      return new Response(JSON.stringify({ ok: true, sent, skipped }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams({ test_sent: "1", sent: sent.join(",") });
    if (skipped.length > 0) params.set("skipped", skipped.join(","));
    return redirect(`${redirectTo}?${params.toString()}`);
  } catch (error) {
    console.error("Test alert failed:", error);
    if (json) {
      return new Response(JSON.stringify({ error: "Test alert failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    return redirect(`${redirectTo}?test_error=1`);
  }
};
