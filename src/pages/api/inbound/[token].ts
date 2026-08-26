import type { APIRoute } from "astro";
import { resolveInboundWebhook } from "../../../lib/inboundWebhooks";
import {
  applySnoozeForHouseholdMembers,
  applyVacationForHouseholdMembers,
} from "../../../lib/alertSnoozeTokens";

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  const token = params.token?.trim();
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing token" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const resolved = await resolveInboundWebhook(token);
  if (!resolved) {
    return new Response(JSON.stringify({ error: "Invalid webhook" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const action =
    typeof body.action === "string"
      ? body.action
      : new URL(request.url).searchParams.get("action");

  if (action === "snooze") {
    const hours = Number(body.hours ?? 24);
    const count = await applySnoozeForHouseholdMembers(
      resolved.householdId,
      Number.isFinite(hours) ? hours : 24,
    );
    return new Response(JSON.stringify({ ok: true, action: "snooze", members: count }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (action === "vacation") {
    const days = Number(body.days ?? 7);
    const count = await applyVacationForHouseholdMembers(
      resolved.householdId,
      Number.isFinite(days) ? days : 7,
    );
    return new Response(JSON.stringify({ ok: true, action: "vacation", members: count }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      message: "Webhook received. Use action=snooze or action=vacation.",
    }),
    { headers: { "Content-Type": "application/json" } },
  );
};
