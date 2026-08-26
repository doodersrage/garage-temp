import type { APIRoute } from "astro";
import { fetchWeatherSnapshot, resolveWeatherCityId } from "../../../lib/FetchWeather";

export const GET: APIRoute = async ({ url }) => {
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
