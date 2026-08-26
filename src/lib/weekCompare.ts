import type { ChartPoint } from "./garageTempsHistory";

export type WeekCompareResult = {
  thisWeekAvgF: number | null;
  priorYearAvgF: number | null;
  deltaF: number | null;
  sampleCount: number;
};

export function averageTempF(points: ChartPoint[]): number | null {
  const temps = points.map((p) => p.tempf).filter((t) => Number.isFinite(t));
  if (temps.length === 0) return null;
  return temps.reduce((a, b) => a + b, 0) / temps.length;
}

export function compareWeekAverages(
  thisWeek: ChartPoint[],
  priorYearWeek: ChartPoint[],
): WeekCompareResult {
  const thisWeekAvgF = averageTempF(thisWeek);
  const priorYearAvgF = averageTempF(priorYearWeek);
  const deltaF =
    thisWeekAvgF != null && priorYearAvgF != null
      ? thisWeekAvgF - priorYearAvgF
      : null;

  return {
    thisWeekAvgF,
    priorYearAvgF,
    deltaF,
    sampleCount: thisWeek.length,
  };
}
