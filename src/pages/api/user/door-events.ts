import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { computeDoorOpenSessions } from "../../../lib/doorDuration";
import { listDoorEvents } from "../../../lib/doorEvents";
import { listHouseholdDevices } from "../../../lib/devices";
import { getOrCreateHouseholdForUser } from "../../../lib/households";
import { fetchRecentBoolReadings } from "../../../lib/sensorReadings";

export const GET: APIRoute = async ({ cookies, url }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const household = await getOrCreateHouseholdForUser(user.id, user.email);
  if (!household.householdId) {
    return new Response(JSON.stringify({ live_sessions: [], history: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const limitRaw = Number(url.searchParams.get("limit") ?? "12");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.floor(limitRaw), 1), 50)
    : 12;

  const [{ devices }, history] = await Promise.all([
    listHouseholdDevices(household.householdId),
    listDoorEvents(household.householdId, limit),
  ]);

  const doorSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const liveSessions = [];

  for (const device of devices) {
    for (const sensor of device.sensors) {
      if (sensor.kind !== "door") continue;
      const readings = await fetchRecentBoolReadings(sensor.id, doorSince);
      liveSessions.push(
        ...computeDoorOpenSessions(
          readings.map((r) => ({
            label: sensor.label,
            kind: "door",
            value: r.value,
            recordedAt: r.recordedAt,
          })),
        ),
      );
    }
  }

  return new Response(
    JSON.stringify({
      live_sessions: liveSessions.map((session) => ({
        label: session.label,
        opened_at: session.openedAt,
        closed_at: session.closedAt,
        duration_ms: session.durationMs,
        still_open: session.stillOpen,
      })),
      history: history.map((event) => ({
        id: event.id,
        label: event.label,
        opened_at: event.opened_at,
        closed_at: event.closed_at,
        duration_ms: event.duration_ms,
      })),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    },
  );
};
