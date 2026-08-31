import type { APIRoute } from "astro";
import { fetchTemps } from "../../../lib/FetchTemps";
import {
  buildFeedDisplayGroups,
  getDefaultTempFeeds,
  getDefaultTempProbes,
} from "../../../lib/tempFeedConfig";
import { checkDemoTempsRateLimit } from "../../../lib/demoTempsLimits";

/** Public demo garage temperatures for signed-out Home visitors. */
export const GET: APIRoute = async ({ clientAddress }) => {
  const rate = checkDemoTempsRateLimit(clientAddress || "unknown");
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...(rate.retryAfterSec ? { "Retry-After": String(rate.retryAfterSec) } : {}),
      },
    });
  }

  const feeds = getDefaultTempFeeds();
  const probes = getDefaultTempProbes();

  const results = await fetchTemps({
    feeds,
    probes,
    saveToDatabase: false,
  });

  const groups = buildFeedDisplayGroups(feeds, probes, results).map((group) => ({
    feedId: group.feedId,
    feedName: group.feedName,
    enabled: group.enabled,
    error: group.error,
    probes: group.probes.map((probe) => ({
      key: probe.key,
      label: probe.label,
      data: probe.data
        ? { f: probe.data.f, c: probe.data.c, h: probe.data.h }
        : null,
    })),
  }));

  return new Response(
    JSON.stringify({
      updatedAt: new Date().toISOString(),
      groups,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    },
  );
};
