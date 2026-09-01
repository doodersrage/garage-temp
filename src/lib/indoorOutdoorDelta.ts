import { fetchWeatherSnapshot, resolveWeatherCityId } from "./FetchWeather";
import { fetchWeatherSnapshotForConfig, getPersonalWeatherConfig } from "./weatherContext";
import type { ChartPoint } from "./garageTempsHistory";

export type IndoorOutdoorDelta = {
  outdoorF: number;
  outdoorDescription: string;
  indoorAvgF: number;
  deltaF: number;
  cityName: string | null;
};

export type IndoorOutdoorPoint = {
  timestamp: string;
  indoorF: number;
  outdoorF: number;
  deltaF: number;
};

export function buildIndoorOutdoorSeries(
  points: ChartPoint[],
  outdoorF: number,
): IndoorOutdoorPoint[] {
  if (!Number.isFinite(outdoorF)) return [];
  return [...points]
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .map((point) => ({
      timestamp: point.timestamp,
      indoorF: point.tempf,
      outdoorF,
      deltaF: point.tempf - outdoorF,
    }));
}

export function computeIndoorOutdoorDelta(
  points: ChartPoint[],
  outdoorF: number,
  outdoorDescription: string,
  cityName: string | null,
): IndoorOutdoorDelta | null {
  if (points.length === 0 || !Number.isFinite(outdoorF)) return null;

  const indoorAvgF =
    points.reduce((sum, point) => sum + point.tempf, 0) / points.length;

  return {
    outdoorF,
    outdoorDescription,
    indoorAvgF,
    deltaF: indoorAvgF - outdoorF,
    cityName,
  };
}

export async function fetchIndoorOutdoorDelta(
  points: ChartPoint[],
  weatherCityId?: string | null,
  user?: { user_metadata?: Record<string, unknown> } | null,
): Promise<IndoorOutdoorDelta | null> {
  if (points.length === 0) return null;

  const weather = user
    ? await fetchWeatherSnapshotForConfig(getPersonalWeatherConfig(user))
    : await fetchWeatherSnapshot(resolveWeatherCityId(weatherCityId));
  if (!weather) return null;

  return computeIndoorOutdoorDelta(
    points,
    weather.temp,
    weather.description,
    weather.name,
  );
}
