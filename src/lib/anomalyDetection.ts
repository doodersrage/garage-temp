import type { ChartPoint } from "./garageTempsHistory";

export type AnomalyNotice = {
  probeLabel: string;
  message: string;
  severity: "warning" | "info";
};

export type DoorStateAtTime = {
  label: string;
  open: boolean;
  recordedAt: string;
};

/** Flag sudden temperature drops; note if a door was open nearby. */
export function detectTemperatureAnomalies(
  points: ChartPoint[],
  dropThresholdF = 10,
  windowMs = 60 * 60 * 1000,
  doorEvents: DoorStateAtTime[] = [],
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
        const doorOpen = doorWasOpenNear(
          doorEvents,
          Date.parse(current.timestamp),
          30 * 60 * 1000,
        );
        const doorHint = doorOpen
          ? " A door sensor was open around this time."
          : "";
        notices.push({
          probeLabel,
          severity: "warning",
          message: `${probeLabel} dropped ${drop.toFixed(1)}°F within ${Math.round(elapsed / 60000)} minutes (${prev.tempf.toFixed(1)}°F → ${current.tempf.toFixed(1)}°F).${doorHint}`,
        });
        break;
      }
    }
  }

  return notices;
}

function doorWasOpenNear(
  events: DoorStateAtTime[],
  atMs: number,
  windowMs: number,
): boolean {
  return events.some((event) => {
    if (!event.open) return false;
    const t = Date.parse(event.recordedAt);
    return Math.abs(t - atMs) <= windowMs;
  });
}
