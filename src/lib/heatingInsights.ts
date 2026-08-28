import type { ChartPoint } from "./garageTempsHistory";

export type HeatingInsight = {
  label: string;
  detail: string;
  severity: "info" | "warning";
};

/** Estimate heating loss rate (°F/h) from recent indoor samples vs outdoor temp. */
export function estimateHeatingLossRate(
  indoorPoints: ChartPoint[],
  outdoorTempF: number | null,
): number | null {
  const temps = indoorPoints
    .filter((p) => Number.isFinite(p.tempf))
    .slice(-12);
  if (temps.length < 2) return null;

  const first = temps[0]!;
  const last = temps[temps.length - 1]!;
  const hours =
    (Date.parse(last.timestamp) - Date.parse(first.timestamp)) / (60 * 60 * 1000);
  if (hours <= 0) return null;

  const rate = (last.tempf - first.tempf) / hours;
  if (!Number.isFinite(rate)) return null;

  // Normalize: colder outdoor should correlate with faster drop
  if (outdoorTempF != null && outdoorTempF < 32 && rate < 0) {
    return rate;
  }
  return rate;
}

export function buildHeatingInsights(options: {
  indoorPoints: ChartPoint[];
  outdoorTempF: number | null;
  freezeThresholdF: number;
  doorOpenMinutes?: number | null;
}): HeatingInsight[] {
  const insights: HeatingInsight[] = [];
  const latest = options.indoorPoints.filter((p) => Number.isFinite(p.tempf)).at(-1);
  if (!latest) return insights;

  const rate = estimateHeatingLossRate(options.indoorPoints, options.outdoorTempF);
  if (rate != null && rate <= -2) {
    insights.push({
      label: "Rapid temperature drop",
      detail: `Space is falling about ${Math.abs(rate).toFixed(1)}°F/h. Check doors, heaters, and insulation.`,
      severity: "warning",
    });
  }

  if (
    options.doorOpenMinutes != null &&
    options.doorOpenMinutes >= 10 &&
    rate != null &&
    rate < 0
  ) {
    insights.push({
      label: "Door may be driving heat loss",
      detail: `Door open ~${Math.round(options.doorOpenMinutes)} min while temperature is falling.`,
      severity: "warning",
    });
  }

  if (latest.tempf <= options.freezeThresholdF + 5) {
    insights.push({
      label: "Near freeze threshold",
      detail: `Current ${latest.tempf.toFixed(1)}°F — threshold is ${options.freezeThresholdF}°F.`,
      severity: latest.tempf <= options.freezeThresholdF ? "warning" : "info",
    });
  }

  if (options.outdoorTempF != null && options.outdoorTempF <= 20 && latest.tempf > options.freezeThresholdF) {
    const margin = latest.tempf - options.freezeThresholdF;
    insights.push({
      label: "Cold snap outside",
      detail: `Outdoor ${options.outdoorTempF.toFixed(0)}°F — ${margin.toFixed(0)}°F margin above your freeze alert.`,
      severity: margin <= 8 ? "warning" : "info",
    });
  }

  return insights;
}
