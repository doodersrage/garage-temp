import type { APIRoute } from "astro";
import { getAuthFromRequest } from "../../../lib/auth";
import {
  fetchGarageTempChartData,
  fetchGarageTempHistory,
  fetchHistoryFilterOptions,
} from "../../../lib/garageTempsHistory";
import { getUserHouseholdId } from "../../../lib/households";
import { getIndoorReferenceSensorId } from "../../../lib/indoorReference";
import { fetchHouseChartOverlay } from "../../../lib/houseContext";
import { listConnectionsForHousehold } from "../../../lib/thermostatConnections";

export const GET: APIRoute = async ({ request, cookies, url }) => {
  const { session, user } = await getAuthFromRequest(request, cookies);
  if (!session || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const daysRaw = Number(url.searchParams.get("days") ?? "7");
  const days = Number.isFinite(daysRaw)
    ? Math.min(Math.max(Math.floor(daysRaw), 1), 90)
    : 7;
  const pageRaw = Number(url.searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageRaw) ? Math.max(Math.floor(pageRaw), 1) : 1;
  const pageSizeRaw = Number(url.searchParams.get("page_size") ?? "20");
  const pageSize = Number.isFinite(pageSizeRaw)
    ? Math.min(Math.max(Math.floor(pageSizeRaw), 5), 100)
    : 20;
  const feed = url.searchParams.get("feed")?.trim() || undefined;
  const probe = url.searchParams.get("probe")?.trim() || undefined;
  const from = url.searchParams.get("from")?.trim() || undefined;
  const to = url.searchParams.get("to")?.trim() || undefined;
  const include = new Set(
    (url.searchParams.get("include") ?? "chart,readings,filters")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const filters = {
    feedName: feed,
    probeKey: probe,
    from,
    to,
  };

  const [chart, readings, filterOptions, houseOverlay] = await Promise.all([
    include.has("chart")
      ? fetchGarageTempChartData(user.id, days, filters)
      : Promise.resolve(null),
    include.has("readings")
      ? fetchGarageTempHistory(user.id, page, pageSize, filters)
      : Promise.resolve(null),
    include.has("filters")
      ? fetchHistoryFilterOptions(user.id)
      : Promise.resolve(null),
    include.has("house_overlay")
      ? (async () => {
          const householdId = await getUserHouseholdId(user.id);
          if (!householdId) return { points: [], source: null };
          const [connections, referenceSensorId] = await Promise.all([
            listConnectionsForHousehold(householdId),
            getIndoorReferenceSensorId(householdId),
          ]);
          return fetchHouseChartOverlay({
            householdId,
            days,
            hasThermostatConnection: connections.length > 0,
            referenceSensorId,
            filters: { from: filters.from, to: filters.to },
          });
        })()
      : Promise.resolve(null),
  ]);

  return new Response(
    JSON.stringify({
      days,
      chart: chart
        ? { points: chart.points, error: chart.error }
        : undefined,
      house_overlay: houseOverlay
        ? {
            source: houseOverlay.source,
            points: houseOverlay.points,
          }
        : undefined,
      readings: readings ?? undefined,
      filters: filterOptions
        ? {
            feeds: filterOptions.feeds,
            probes: filterOptions.probes,
            error: filterOptions.error,
          }
        : undefined,
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
