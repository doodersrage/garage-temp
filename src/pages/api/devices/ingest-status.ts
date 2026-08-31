import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getOrCreateHouseholdForUser } from "../../../lib/households";
import { listHouseholdDevices } from "../../../lib/devices";
import { fetchLatestSensorValues } from "../../../lib/sensorReadings";

/** Lightweight status for the Devices “waiting for first POST” poller. */
export const GET: APIRoute = async ({ cookies }) => {
  const { user } = await getAuthFromCookies(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const household = await getOrCreateHouseholdForUser(user.id, user.email);
  if (!household.householdId) {
    return new Response(
      JSON.stringify({ waiting: false, devices: [], latestCount: 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const [{ devices }, latest] = await Promise.all([
    listHouseholdDevices(household.householdId),
    fetchLatestSensorValues(household.householdId),
  ]);

  const push = devices.filter((d) => d.source === "push");
  const waitingDevices = push
    .filter((d) => !d.last_seen_at && d.sensors.length > 0)
    .map((d) => ({
      id: d.id,
      name: d.name,
      sensorKeys: d.sensors.map((s) => s.key),
      lastSeenAt: d.last_seen_at,
    }));

  const seenCount = push.filter((d) => Boolean(d.last_seen_at)).length;

  return new Response(
    JSON.stringify({
      waiting: waitingDevices.length > 0,
      waitingCount: waitingDevices.length,
      seenCount,
      latestCount: latest.length,
      devices: waitingDevices,
      checkedAt: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
};
