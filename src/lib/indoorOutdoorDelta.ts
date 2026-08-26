import { fetchWeatherSnapshot } from "./FetchWeather";
import type { ChartPoint } from "./garageTempsHistory";

export type IndoorOutdoorDelta = {
  outdoorF: number;
  outdoorDescription: string;
  indoorAvgF: number;
  deltaF: number;
  cityName: string | null;
};

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
): Promise<IndoorOutdoorDelta | null> {
  if (points.length === 0) return null;

  const weather = await fetchWeatherSnapshot(weatherCityId);
  if (!weather) return null;

  return computeIndoorOutdoorDelta(
    points,
    weather.temp,
    weather.description,
    weather.name,
  );
}
