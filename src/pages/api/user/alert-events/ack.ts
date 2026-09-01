import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../../lib/auth";
import {
  executeAlertAckPlaybook,
  type AckPlaybookAction,
} from "../../../../lib/alertAckPlaybook";
import { formRedirectPath } from "../../../../lib/siteUrl";
import { getSiteUrl } from "../../../../lib/stripe";

const VALID_ACTIONS = new Set<AckPlaybookAction>([
  "ack",
  "snooze_4h",
  "snooze_24h",
  "notify_tenant",
  "webhook_ping",
]);

function wantsJson(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  return accept.includes("application/json") || contentType.includes("application/json");
}

function parseAction(raw: unknown): AckPlaybookAction {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (VALID_ACTIONS.has(value as AckPlaybookAction)) {
    return value as AckPlaybookAction;
  }
  return "ack";
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    if (wantsJson(request)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return redirect("/signin");
  }

  let eventId: number | null = null;
  let redirectTo = "/dashboard/alerts";
  let action: AckPlaybookAction = "ack";

  if ((request.headers.get("content-type") ?? "").includes("application/json")) {
    try {
      const body = (await request.json()) as {
        event_id?: number | string;
        action?: string;
      };
      eventId = Number(body.event_id);
      action = parseAction(body.action);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  } else {
    const formData = await request.formData();
    eventId = Number(formData.get("event_id"));
    action = parseAction(formData.get("action")?.toString());
    redirectTo = formRedirectPath(formData, redirectTo);
  }

  if (!Number.isFinite(eventId)) {
    if (wantsJson(request)) {
      return new Response(JSON.stringify({ error: "Invalid event_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    return redirect(`${redirectTo}?ack_error=1`);
  }

  const siteUrl = getSiteUrl(request).replace(/\/$/, "");
  const result = await executeAlertAckPlaybook({
    userId: user.id,
    userEmail: user.email,
    eventId,
    action,
    siteUrl,
  });

  if (!result.ok) {
    if (wantsJson(request)) {
      return new Response(JSON.stringify({ error: result.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    return redirect(
      `${redirectTo}?ack_error=1&ack_msg=${encodeURIComponent(result.message)}`,
    );
  }

  if (wantsJson(request)) {
    return new Response(
      JSON.stringify({ ok: true, event_id: eventId, action, message: result.message }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return redirect(`${redirectTo}?ack_ok=1&ack_msg=${encodeURIComponent(result.message)}`);
};
