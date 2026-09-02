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
