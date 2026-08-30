import type { ChartPoint } from "./garageTempsHistory";

function utcDayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** UTC calendar day (YYYY-MM-DD) with the lowest minimum temperature. */
export function findColdestUtcDay(points: ChartPoint[]): string | null {
  const byDay = new Map<string, number>();
  for (const point of points) {
    if (!Number.isFinite(point.tempf)) continue;
    const day = utcDayKey(point.timestamp);
    if (!day) continue;
    const prev = byDay.get(day);
    if (prev == null || point.tempf < prev) byDay.set(day, point.tempf);
  }
  let bestDay: string | null = null;
  let bestTemp = Infinity;
  for (const [day, minTemp] of byDay) {
    if (minTemp < bestTemp) {
      bestTemp = minTemp;
      bestDay = day;
    }
  }
  return bestDay;
}

export function extractUtcDayPoints(
  points: ChartPoint[],
  dayKey: string,
): ChartPoint[] {
  return points
    .filter((p) => utcDayKey(p.timestamp) === dayKey)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

/**
 * Shift a day's points so they share the same UTC calendar day as `targetDayKey`,
 * preserving time-of-day — for overlaying last year's coldest day on the current chart.
 */
export function shiftDayPointsToTargetDay(
  dayPoints: ChartPoint[],
  targetDayKey: string,
): ChartPoint[] {
  if (dayPoints.length === 0 || !/^\d{4}-\d{2}-\d{2}$/.test(targetDayKey)) {
    return [];
  }
  const sourceDay = utcDayKey(dayPoints[0]!.timestamp);
  if (!sourceDay) return [];
  const sourceStart = Date.parse(`${sourceDay}T00:00:00.000Z`);
  const targetStart = Date.parse(`${targetDayKey}T00:00:00.000Z`);
  if (!Number.isFinite(sourceStart) || !Number.isFinite(targetStart)) return [];
  const delta = targetStart - sourceStart;

  return dayPoints.map((point) => ({
    ...point,
    timestamp: new Date(Date.parse(point.timestamp) + delta).toISOString(),
    probeLabel: point.probeLabel ? `${point.probeLabel} (coldest last year)` : "Coldest last year",
  }));
}

export function buildColdestDayOverlay(
  priorYearPoints: ChartPoint[],
  currentPoints: ChartPoint[],
): { overlay: ChartPoint[]; coldestDay: string | null; minTempF: number | null } {
  const coldestDay = findColdestUtcDay(priorYearPoints);
  if (!coldestDay) {
    return { overlay: [], coldestDay: null, minTempF: null };
  }
  const dayPoints = extractUtcDayPoints(priorYearPoints, coldestDay);
  const minTempF = dayPoints.reduce(
    (min, p) => (p.tempf < min ? p.tempf : min),
    Infinity,
  );
  const anchorDay =
    currentPoints.length > 0
      ? utcDayKey(currentPoints[currentPoints.length - 1]!.timestamp)
      : new Date().toISOString().slice(0, 10);
  return {
    overlay: shiftDayPointsToTargetDay(dayPoints, anchorDay),
    coldestDay,
    minTempF: Number.isFinite(minTempF) ? minTempF : null,
  };
}

/** Align a prior-year window onto the current chart's start so overlays share the X axis. */
export function shiftSeriesOntoCurrentWindow(
  series: ChartPoint[],
  currentPoints: ChartPoint[],
): ChartPoint[] {
  if (series.length < 2 || currentPoints.length < 2) return [];
  const sortedSeries = [...series].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  );
  const sortedCurrent = [...currentPoints].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  );
  const seriesStart = Date.parse(sortedSeries[0]!.timestamp);
  const currentStart = Date.parse(sortedCurrent[0]!.timestamp);
  if (!Number.isFinite(seriesStart) || !Number.isFinite(currentStart)) return [];
  const delta = currentStart - seriesStart;
  return sortedSeries.map((point) => ({
    ...point,
    timestamp: new Date(Date.parse(point.timestamp) + delta).toISOString(),
  }));
}
