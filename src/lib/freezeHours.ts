import type { ChartPoint } from "./garageTempsHistory";

export type FreezeHoursSummary = {
  hoursBelow34: number;
  readingsBelow34: number;
  totalReadings: number;
  coldestF: number | null;
};

/** Estimate freeze exposure from chart points (readings below 34°F). */
export function computeFreezeHours(
  points: ChartPoint[],
  thresholdF = 34,
): FreezeHoursSummary {
  const below = points.filter((p) => p.tempf <= thresholdF);
  if (points.length < 2) {
    return {
      hoursBelow34: 0,
      readingsBelow34: below.length,
      totalReadings: points.length,
      coldestF: below.length ? Math.min(...below.map((p) => p.tempf)) : null,
    };
  }

  const sorted = [...points].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  );
  let msBelow = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (prev.tempf <= thresholdF || cur.tempf <= thresholdF) {
      msBelow += Math.max(0, Date.parse(cur.timestamp) - Date.parse(prev.timestamp));
    }
  }

  return {
    hoursBelow34: msBelow / (60 * 60 * 1000),
    readingsBelow34: below.length,
    totalReadings: points.length,
    coldestF: below.length ? Math.min(...below.map((p) => p.tempf)) : null,
  };
}
