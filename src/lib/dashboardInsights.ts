import type { User } from "@supabase/supabase-js";
import {
  fetchGarageTempChartData,
  type ChartPoint,
} from "./garageTempsHistory";
import { compareWeekAverages, type WeekCompareResult } from "./weekCompare";
import { estimateTimeToFreeze, type TempSample } from "./timeToFreeze";
import { fetchPriorYearCompareBundle } from "./priorYearCompare";

const EMPTY_COMPARE: WeekCompareResult = {
  thisWeekAvgF: null,
  priorYearAvgF: null,
  deltaF: null,
  sampleCount: 0,
  priorYearSource: "none",
  priorYearOutdoorLabel: null,
  earliestLocalReadingAt: null,
};

export async function fetchWeekCompare(
  userId: string,
  user?: User | null,
): Promise<{ compare: WeekCompareResult; error: string | null }> {
  const [thisWeekResult, priorYearBundle] = await Promise.all([
    fetchGarageTempChartData(userId, 7),
    fetchPriorYearCompareBundle(userId, 7, {}, user),
  ]);

  if (thisWeekResult.error) {
    return { compare: { ...EMPTY_COMPARE }, error: thisWeekResult.error };
  }

  const base = compareWeekAverages(thisWeekResult.points, priorYearBundle.points);
  const priorYearAvgF = base.priorYearAvgF;
  const deltaF =
    base.thisWeekAvgF != null && priorYearAvgF != null
      ? base.thisWeekAvgF - priorYearAvgF
      : null;

  return {
    compare: {
      ...base,
      priorYearAvgF,
      deltaF,
      priorYearSource: priorYearBundle.source,
      priorYearOutdoorLabel: priorYearBundle.outdoorLocationLabel,
      earliestLocalReadingAt: priorYearBundle.earliestLocalReadingAt,
    },
    error: null,
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
