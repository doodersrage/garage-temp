import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../../lib/auth";
import { acknowledgeAlertEvent } from "../../../../lib/alertEvents";

function wantsJson(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  return accept.includes("application/json") || contentType.includes("application/json");
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

  if ((request.headers.get("content-type") ?? "").includes("application/json")) {
    try {
      const body = (await request.json()) as { event_id?: number | string };
      eventId = Number(body.event_id);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  } else {
    const formData = await request.formData();
    eventId = Number(formData.get("event_id"));
    redirectTo = formData.get("redirect")?.toString() || redirectTo;
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

  const result = await acknowledgeAlertEvent(user.id, eventId);
  if (!result.ok) {
    if (wantsJson(request)) {
      return new Response(JSON.stringify({ error: result.error ?? "Ack failed" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    return redirect(`${redirectTo}?ack_error=1`);
  }

  if (wantsJson(request)) {
    return new Response(JSON.stringify({ ok: true, event_id: eventId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return redirect(`${redirectTo}?ack_ok=1`);
};
