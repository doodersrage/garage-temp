import type { APIRoute } from "astro";
import { checkDemoTempsRateLimit } from "../../../lib/demoTempsLimits";
import { getExampleFeedUrl } from "../../../lib/exampleFeed";
import {
  formatExampleFeedResponse,
  fetchWeatherSimulatedFeed,
  type ExampleFeedFormat,
} from "../../../lib/weatherSimulatedFeed";
import { resolveSiteUrl } from "../../../lib/schemaMarkup";

function parseFormat(raw: string | null): ExampleFeedFormat {
  if (raw === "ingest" || raw === "document") return raw;
  if (raw === "senml" || raw === "homeassistant" || raw === "ha") {
    return raw === "ha" ? "homeassistant" : raw;
  }
  return "pull";
}

function parseOptionalBool(raw: string | null): boolean | undefined {
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return undefined;
}

function parseOptionalSun(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) return undefined;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Public weather-driven example feed for pull setup and push ingest samples. */
export const GET: APIRoute = async ({ url, clientAddress, site }) => {
  const rate = checkDemoTempsRateLimit(`example-feed:${clientAddress || "unknown"}`);
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...(rate.retryAfterSec ? { "Retry-After": String(rate.retryAfterSec) } : {}),
      },
    });
  }

  const format = parseFormat(url.searchParams.get("format"));
  const cityId = url.searchParams.get("cityId")?.trim() || undefined;
  const doorOpen = parseOptionalBool(url.searchParams.get("door"));
  const sunIntensity = parseOptionalSun(url.searchParams.get("sun"));
  const noisy = url.searchParams.get("noise") !== "0";

  const payload = await fetchWeatherSimulatedFeed({
    cityId,
    doorOpen,
    sunIntensity,
    noisy,
  });

  const siteUrl = resolveSiteUrl(site);
  const feedUrl = getExampleFeedUrl(siteUrl);
  const body = formatExampleFeedResponse(format, payload, feedUrl);

  return new Response(JSON.stringify(body, null, format === "document" ? 2 : 0), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      "X-ThermalTrace-Feed": "weather-simulated-example",
    },
  });
};
