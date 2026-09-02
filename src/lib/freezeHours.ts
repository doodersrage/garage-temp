import type { ChartPoint } from "./garageTempsHistory";

export type FreezeHoursSummary = {
  hoursBelow34: number;
  /** Degree-hours below threshold (severity × time). */
  degreeHoursBelow: number;
  readingsBelow34: number;
  totalReadings: number;
  coldestF: number | null;
};

/** Estimate freeze exposure from chart points (readings below threshold). */
export function computeFreezeHours(
  points: ChartPoint[],
  thresholdF = 34,
): FreezeHoursSummary {
  const below = points.filter((p) => p.tempf <= thresholdF);
  if (points.length < 2) {
    return {
      hoursBelow34: 0,
      degreeHoursBelow: 0,
      readingsBelow34: below.length,
      totalReadings: points.length,
      coldestF: below.length ? Math.min(...below.map((p) => p.tempf)) : null,
    };
  }

  const sorted = [...points].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  );
  let msBelow = 0;
  let degreeMs = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    const dt = Math.max(0, Date.parse(cur.timestamp) - Date.parse(prev.timestamp));
    if (prev.tempf <= thresholdF || cur.tempf <= thresholdF) {
      msBelow += dt;
      const avgDeficit =
        (Math.max(0, thresholdF - prev.tempf) + Math.max(0, thresholdF - cur.tempf)) /
        2;
      degreeMs += avgDeficit * dt;
    }
  }

  return {
    hoursBelow34: msBelow / (60 * 60 * 1000),
    degreeHoursBelow: degreeMs / (60 * 60 * 1000),
    readingsBelow34: below.length,
    totalReadings: points.length,
    coldestF: below.length ? Math.min(...below.map((p) => p.tempf)) : null,
  };
}
