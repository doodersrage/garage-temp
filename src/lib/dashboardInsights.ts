import {
  fetchGarageTempChartData,
  fetchGarageTempChartDataPriorYear,
  type ChartPoint,
} from "./garageTempsHistory";
import { compareWeekAverages, type WeekCompareResult } from "./weekCompare";
import { estimateTimeToFreeze, type TempSample } from "./timeToFreeze";

export async function fetchWeekCompare(
  userId: string,
): Promise<{ compare: WeekCompareResult; error: string | null }> {
  const [thisWeekResult, priorYearResult] = await Promise.all([
    fetchGarageTempChartData(userId, 7),
    fetchGarageTempChartDataPriorYear(userId, 7),
  ]);

  if (thisWeekResult.error) {
    return { compare: compareWeekAverages([], []), error: thisWeekResult.error };
  }

  return {
    compare: compareWeekAverages(thisWeekResult.points, priorYearResult.points),
    error: priorYearResult.error,
  };
}

export function buildTimeToFreezeFromPoints(
  points: ChartPoint[],
  freezeThresholdF: number,
): ReturnType<typeof estimateTimeToFreeze> {
  const tempPoints = points.filter((p) => Number.isFinite(p.tempf));
  if (tempPoints.length === 0) {
    return {
      hours: null,
      rateFPerHour: null,
      message: "No temperature readings yet.",
    };
  }

  const latest = tempPoints[tempPoints.length - 1]!;
  const samples: TempSample[] = tempPoints.slice(-12).map((p) => ({
    at: p.timestamp,
    tempF: p.tempf,
  }));

  return estimateTimeToFreeze(latest.tempf, freezeThresholdF, samples);
}
