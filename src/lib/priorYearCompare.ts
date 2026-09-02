import type { User } from "@supabase/supabase-js";
import {
  fetchGarageTempChartDataPriorYear,
  fetchEarliestSensorReadingAt,
  type ChartPoint,
  type HistoryFilters,
} from "./garageTempsHistory";
import { getUserHouseholdId } from "./households";
import { resolveOutdoorCompareCoords } from "./outdoorCompareCoords";
import {
  averageOpenMeteoTempF,
  fetchOpenMeteoHourlyHistory,
  openMeteoPointsToChartPoints,
  priorYearWindow,
} from "./openMeteoHistory";

export type PriorYearSource = "local" | "outdoor_estimate" | "none";

export type PriorYearCompareBundle = {
  points: ChartPoint[];
  source: PriorYearSource;
  outdoorLocationLabel: string | null;
  earliestLocalReadingAt: string | null;
};

export async function fetchPriorYearCompareBundle(
  userId: string,
  days: number,
  filters: HistoryFilters = {},
  user?: User | null,
): Promise<PriorYearCompareBundle> {
  const householdId = await getUserHouseholdId(userId);

  const [localResult, earliestLocalReadingAt] = await Promise.all([
    fetchGarageTempChartDataPriorYear(userId, days, filters),
    householdId
      ? fetchEarliestSensorReadingAt(householdId)
      : Promise.resolve(null),
  ]);

  if (localResult.points.length > 0) {
    return {
      points: localResult.points,
      source: "local",
      outdoorLocationLabel: null,
      earliestLocalReadingAt,
    };
  }

  const coords = await resolveOutdoorCompareCoords(userId, user);
  if (!coords) {
    return {
      points: [],
      source: "none",
      outdoorLocationLabel: null,
      earliestLocalReadingAt,
    };
  }

  const { start, end } = priorYearWindow(days);
  const hourly = await fetchOpenMeteoHourlyHistory(coords.lat, coords.lon, start, end);
  if (hourly.length === 0) {
    return {
      points: [],
      source: "none",
      outdoorLocationLabel: coords.label,
      earliestLocalReadingAt,
    };
  }

  const avg = averageOpenMeteoTempF(hourly);
  if (avg == null) {
    return {
      points: [],
      source: "none",
      outdoorLocationLabel: coords.label,
      earliestLocalReadingAt,
    };
  }

  return {
    points: openMeteoPointsToChartPoints(hourly),
    source: "outdoor_estimate",
    outdoorLocationLabel: coords.label,
    earliestLocalReadingAt,
  };
}
