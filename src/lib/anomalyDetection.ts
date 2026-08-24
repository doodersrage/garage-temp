import type { ChartPoint } from "./garageTempsHistory";

export type AnomalyNotice = {
  probeLabel: string;
  message: string;
  severity: "warning" | "info";
};

/** Flag sudden temperature drops that may indicate a door left open or heater failure. */
export function detectTemperatureAnomalies(
  points: ChartPoint[],
  dropThresholdF = 10,
  windowMs = 60 * 60 * 1000,
): AnomalyNotice[] {
  const notices: AnomalyNotice[] = [];
  const byProbe = new Map<string, ChartPoint[]>();

  for (const point of points) {
    const label = point.probeLabel;
    const group = byProbe.get(label) ?? [];
    group.push(point);
    byProbe.set(label, group);
  }

  for (const [probeLabel, probePoints] of byProbe) {
    const sorted = [...probePoints].sort(
      (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
    );

    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const current = sorted[i];
      const elapsed = Date.parse(current.timestamp) - Date.parse(prev.timestamp);
      const drop = prev.tempf - current.tempf;

      if (elapsed > 0 && elapsed <= windowMs && drop >= dropThresholdF) {
        notices.push({
          probeLabel,
          severity: "warning",
          message: `${probeLabel} dropped ${drop.toFixed(1)}°F within ${Math.round(elapsed / 60000)} minutes (${prev.tempf.toFixed(1)}°F → ${current.tempf.toFixed(1)}°F).`,
        });
        break;
      }
    }
  }

  return notices;
}
