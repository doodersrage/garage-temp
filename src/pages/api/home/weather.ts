import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { fetchWeatherSnapshot, resolveWeatherCityId } from "../../../lib/FetchWeather";
import { checkWeatherSearchRateLimit } from "../../../lib/weatherSearchLimits";
import {
  fetchWeatherSnapshotForConfig,
  getPersonalWeatherConfig,
} from "../../../lib/weatherContext";

export const GET: APIRoute = async ({ url, cookies, clientAddress }) => {
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

  const { user } = await getAuthFromCookies(cookies);
  const cityParam = url.searchParams.get("cityId");
  const sourceParam = url.searchParams.get("source");

  let weather = null;
  let cityId: string | null = null;
  let source: string | null = null;

  if (user && sourceParam !== "openweather") {
    const config = getPersonalWeatherConfig(user);
    weather = await fetchWeatherSnapshotForConfig(config);
    source = weather?.source ?? config.source;
    cityId = config.openWeatherCityId;
  } else if (user && !cityParam) {
    const config = getPersonalWeatherConfig(user);
    if (config.source !== "openweather") {
      weather = await fetchWeatherSnapshotForConfig(config);
      source = weather?.source ?? config.source;
      cityId = config.openWeatherCityId;
    }
  }

  if (!weather) {
    cityId = resolveWeatherCityId(cityParam);
    weather = await fetchWeatherSnapshot(cityId);
    if (weather) {
      weather = { ...weather, source: "openweather" };
      source = "openweather";
    }
  }

  if (!weather) {
    return new Response(
      JSON.stringify({
        error: "Unable to load weather for this location.",
        cityId: cityId || null,
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      },
    );
  }

  return new Response(JSON.stringify({ weather, cityId, source }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
};
