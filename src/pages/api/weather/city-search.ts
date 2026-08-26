import type { APIRoute } from "astro";
import { normalizeGeocodeResults } from "../../../lib/weatherCities";

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return new Response(JSON.stringify({ results: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = String(import.meta.env.NEXT_PUBLIC_OPENWEATHER_API_KEY ?? "")
    .replace(/\r/g, "")
    .trim();
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Weather API not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const endpoint = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=5&appid=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Geocode failed" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
    const raw = await response.json();
    const results = normalizeGeocodeResults(raw);
    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Geocode request failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
};
