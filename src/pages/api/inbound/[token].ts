import type { APIRoute } from "astro";
import { resolveInboundWebhook } from "../../../lib/inboundWebhooks";
import {
  applySnoozeForHouseholdMembers,
  applyVacationForHouseholdMembers,
  clearSnoozeForHouseholdMembers,
  clearVacationForHouseholdMembers,
} from "../../../lib/alertSnoozeTokens";
import { listHouseholdDevices } from "../../../lib/devices";
import { fetchLatestSensorValues } from "../../../lib/sensorReadings";
import { recordHouseholdActivity } from "../../../lib/householdActivity";

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
    await recordHouseholdActivity({
      householdId: resolved.householdId,
      action: "inbound_snooze",
      detail: `${hours}h`,
    });
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
    await recordHouseholdActivity({
      householdId: resolved.householdId,
      action: "inbound_vacation",
      detail: `${days}d`,
    });
    return new Response(JSON.stringify({ ok: true, action: "vacation", members: count }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (action === "clear_snooze") {
    const count = await clearSnoozeForHouseholdMembers(resolved.householdId);
    return new Response(JSON.stringify({ ok: true, action: "clear_snooze", members: count }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (action === "clear_vacation") {
    const count = await clearVacationForHouseholdMembers(resolved.householdId);
    return new Response(JSON.stringify({ ok: true, action: "clear_vacation", members: count }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (action === "status") {
    const devices = await listHouseholdDevices(resolved.householdId);
    const sensors = await fetchLatestSensorValues(resolved.householdId);
    const temps = sensors.filter((s) => s.kind === "temperature" && s.value_num != null);
    return new Response(
      JSON.stringify({
        ok: true,
        action: "status",
        deviceCount: devices.length,
        sensorCount: sensors.length,
        temperatures: temps.slice(0, 8).map((s) => ({
          label: s.label,
          value: s.value_num,
          unit: s.unit,
          recorded_at: s.recorded_at,
        })),
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      message:
        "Use action=snooze, vacation, clear_snooze, clear_vacation, or status.",
    }),
    { headers: { "Content-Type": "application/json" } },
  );
};
