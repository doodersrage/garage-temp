import { getWeatherPresetCoords } from "./weatherCityCoords";

export type NwsGridForecast = {
  gridId: string;
  gridX: number;
  gridY: number;
  minTempF: number | null;
  maxTempF: number | null;
  shortForecast: string | null;
};

const NWS_USER_AGENT =
  import.meta.env.SITE_URL?.trim() || "https://thermaltrace.dev";

/** Fetch NWS gridpoint forecast as a secondary weather source. */
export async function fetchNwsGridForecast(
  lat: number,
  lon: number,
): Promise<NwsGridForecast | null> {
  try {
    const pointRes = await fetch(
      `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`,
      {
        headers: {
          Accept: "application/geo+json",
          "User-Agent": `ThermalTrace (${NWS_USER_AGENT})`,
        },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!pointRes.ok) return null;

    const point = (await pointRes.json()) as {
      properties?: {
        gridId?: string;
        gridX?: number;
        gridY?: number;
        forecast?: string;
      };
    };

    const forecastUrl = point.properties?.forecast;
    if (!forecastUrl) return null;

    const forecastRes = await fetch(forecastUrl, {
      headers: {
        Accept: "application/geo+json",
        "User-Agent": `ThermalTrace (${NWS_USER_AGENT})`,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!forecastRes.ok) return null;

    const forecast = (await forecastRes.json()) as {
      properties?: {
        periods?: Array<{
          temperature?: number;
          temperatureUnit?: string;
          shortForecast?: string;
          isDaytime?: boolean;
        }>;
      };
    };

    const periods = forecast.properties?.periods ?? [];
    const tempsF = periods
      .slice(0, 6)
      .map((p) => {
        const t = p.temperature;
        if (t == null) return null;
        return p.temperatureUnit === "C" ? (t * 9) / 5 + 32 : t;
      })
      .filter((t): t is number => t != null);

    return {
      gridId: point.properties?.gridId ?? "",
      gridX: point.properties?.gridX ?? 0,
      gridY: point.properties?.gridY ?? 0,
      minTempF: tempsF.length ? Math.min(...tempsF) : null,
      maxTempF: tempsF.length ? Math.max(...tempsF) : null,
      shortForecast: periods[0]?.shortForecast ?? null,
    };
  } catch {
    return null;
  }
}

export async function fetchNwsGridForCity(
  cityId: string,
): Promise<NwsGridForecast | null> {
  const coords = getWeatherPresetCoords(cityId);
  if (!coords) return null;
  return fetchNwsGridForecast(coords.lat, coords.lon);
}
