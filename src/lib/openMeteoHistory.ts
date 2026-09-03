import type { ChartPoint } from "./garageTempsHistory";

export type OpenMeteoHourlyPoint = {
  timestamp: string;
  tempf: number;
};

const OPEN_METEO_TIMEOUT_MS = 12_000;

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Prior-year calendar window ending one year before now (matches garage history YoY). */
export function priorYearWindow(days: number): { start: Date; end: Date } {
  const end = new Date();
  end.setFullYear(end.getFullYear() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { start, end };
}

export function parseOpenMeteoHourly(payload: unknown): OpenMeteoHourlyPoint[] {
  if (!payload || typeof payload !== "object") return [];
  const hourly = (payload as { hourly?: { time?: string[]; temperature_2m?: number[] } }).hourly;
  const times = hourly?.time;
  const temps = hourly?.temperature_2m;
  if (!Array.isArray(times) || !Array.isArray(temps)) return [];

  const points: OpenMeteoHourlyPoint[] = [];
  for (let index = 0; index < times.length; index += 1) {
    const timestamp = times[index];
    const tempf = Number(temps[index]);
    if (typeof timestamp !== "string" || !Number.isFinite(tempf)) continue;
    points.push({ timestamp, tempf });
  }
  return points;
}

/** Hourly outdoor temps (°F) from Open-Meteo archive — no API key required. */
export async function fetchOpenMeteoHourlyHistory(
  lat: number,
  lon: number,
  start: Date,
  end: Date,
): Promise<OpenMeteoHourlyPoint[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: formatUtcDate(start),
    end_date: formatUtcDate(end),
    hourly: "temperature_2m",
    temperature_unit: "fahrenheit",
    timezone: "UTC",
  });

  const url = `https://archive-api.open-meteo.com/v1/archive?${params.toString()}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(OPEN_METEO_TIMEOUT_MS),
    });
    if (!response.ok) return [];
    const payload = await response.json();
    return parseOpenMeteoHourly(payload);
  } catch {
    return [];
  }
}

export function averageOpenMeteoTempF(points: OpenMeteoHourlyPoint[]): number | null {
  const temps = points.map((p) => p.tempf).filter((t) => Number.isFinite(t));
  if (temps.length === 0) return null;
  return temps.reduce((sum, temp) => sum + temp, 0) / temps.length;
}

export function openMeteoPointsToChartPoints(
  points: OpenMeteoHourlyPoint[],
  probeLabel = "Outdoor (estimated)",
): ChartPoint[] {
  return points.map((point) => ({
    timestamp: point.timestamp.endsWith("Z")
      ? point.timestamp
      : `${point.timestamp}Z`,
    tempf: point.tempf,
    humidity: 0,
    probeLabel,
  }));
}

function openMeteoPointMs(timestamp: string): number {
  const stamp = timestamp.endsWith("Z") ? timestamp : `${timestamp}Z`;
  return Date.parse(stamp);
}

/** Recent + upcoming hourly outdoor temps from the Open-Meteo forecast API (no key). */
export async function fetchOpenMeteoHourlyWindow(
  lat: number,
  lon: number,
  options?: { pastDays?: number; forecastDays?: number },
): Promise<OpenMeteoHourlyPoint[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];

  const pastDays = options?.pastDays ?? 7;
  const forecastDays = options?.forecastDays ?? 2;
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: "temperature_2m",
    temperature_unit: "fahrenheit",
    timezone: "UTC",
    past_days: String(pastDays),
    forecast_days: String(forecastDays),
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(OPEN_METEO_TIMEOUT_MS),
    });
    if (!response.ok) return [];
    const payload = await response.json();
    return parseOpenMeteoHourly(payload);
  } catch {
    return [];
  }
}

export function splitOpenMeteoPastAndForecast(
  points: OpenMeteoHourlyPoint[],
  nowMs = Date.now(),
): { past: OpenMeteoHourlyPoint[]; forecast: OpenMeteoHourlyPoint[] } {
  const past: OpenMeteoHourlyPoint[] = [];
  const forecast: OpenMeteoHourlyPoint[] = [];
  for (const point of points) {
    const atMs = openMeteoPointMs(point.timestamp);
    if (!Number.isFinite(atMs)) continue;
    if (atMs <= nowMs) past.push(point);
    else forecast.push(point);
  }
  return { past, forecast };
}
