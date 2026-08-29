import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../../lib/auth";
import {
  countUnacknowledgedAlerts,
  listRecentAlertEvents,
} from "../../../../lib/alertEvents";

export const GET: APIRoute = async ({ cookies, url }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const limitRaw = Number(url.searchParams.get("limit") ?? "30");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.floor(limitRaw), 1), 100)
    : 30;

  const [events, unackedCount] = await Promise.all([
    listRecentAlertEvents(user.id, limit),
    countUnacknowledgedAlerts(user.id),
  ]);

  return new Response(
    JSON.stringify({
      events,
      unacked_count: unackedCount,
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
