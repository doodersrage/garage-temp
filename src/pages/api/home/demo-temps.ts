import type { APIRoute } from "astro";
import { checkDemoTempsRateLimit } from "../../../lib/demoTempsLimits";
import { fetchWeatherSimulatedFeed } from "../../../lib/weatherSimulatedFeed";

const PROBE_LABELS: Record<string, string> = {
  "0": "North wall",
  "1": "Door zone",
  "2": "Workbench",
  avg: "Average",
};

/** Public demo probe temperatures for signed-out Home visitors. */
export const GET: APIRoute = async ({ clientAddress, url }) => {
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

  const cityId = url.searchParams.get("cityId")?.trim() || undefined;
  const { pull, meta } = await fetchWeatherSimulatedFeed({ cityId });

  const groups = [
    {
      feedId: "example",
      feedName: "Example shop (weather simulated)",
      enabled: true,
      error: undefined as string | undefined,
      probes: Object.entries(pull.temp).map(([key, data]) => ({
        key,
        label: PROBE_LABELS[key] ?? key,
        data: { f: data.f, c: data.c, h: data.h },
      })),
    },
  ];

  return new Response(
    JSON.stringify({
      updatedAt: meta.generated_at,
      outdoorTempF: meta.outdoor_temp_f,
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
