import type { APIRoute } from "astro";
import { fetchWeatherSnapshot, resolveWeatherCityId } from "../../../lib/FetchWeather";
import { checkWeatherSearchRateLimit } from "../../../lib/weatherSearchLimits";

export const GET: APIRoute = async ({ url, clientAddress }) => {
  // Shares a rate-limit budget with /api/weather/city-search -- both draw
  // on the same OpenWeatherMap API key/quota, and varying ?cityId defeats
  // the Cache-Control hint below for anyone who wants to burn it.
  const rate = checkWeatherSearchRateLimit(clientAddress || "unknown");
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...(rate.retryAfterSec ? { "Retry-After": String(rate.retryAfterSec) } : {}),
      },
    });
  }

  const cityId = url.searchParams.get("cityId");
  const resolved = resolveWeatherCityId(cityId);
  const weather = await fetchWeatherSnapshot(resolved);

  if (!weather) {
    return new Response(
      JSON.stringify({
        error: "Unable to load weather for this location.",
        cityId: resolved || null,
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      },
    );
  }

  return new Response(JSON.stringify({ weather, cityId: resolved }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
};
