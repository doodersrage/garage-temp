import type { ChartPoint } from "./garageTempsHistory";
import type { ThermostatSnapshot } from "./thermostatCorrelation";
import { isThermostatCooling, isThermostatHeating } from "./thermostatCorrelation";

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

/** Dew point °F from air temperature and relative humidity (Magnus-Tetens). */
export function dewPointF(tempF: number, rhPct: number): number | null {
  if (!Number.isFinite(tempF) || !Number.isFinite(rhPct) || rhPct <= 0 || rhPct > 100) {
    return null;
  }
  const tC = (tempF - 32) * (5 / 9);
  const a = 17.62;
  const b = 243.12;
  const gamma = Math.log(rhPct / 100) + (a * tC) / (b + tC);
  const tdC = (b * gamma) / (a - gamma);
  if (!Number.isFinite(tdC)) return null;
  return tdC * (9 / 5) + 32;
}

export function buildHeatingInsights(options: {
  indoorPoints: ChartPoint[];
  outdoorTempF: number | null;
  freezeThresholdF: number;
  doorOpenMinutes?: number | null;
  thermostatSnapshot?: ThermostatSnapshot | null;
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

  const dewPoint = dewPointF(latest.tempf, latest.humidity);
  if (dewPoint != null) {
    const margin = latest.tempf - dewPoint;
    if (margin <= 5) {
      insights.push({
        label: "Condensation risk",
        detail: `Dew point ~${dewPoint.toFixed(0)}°F — air is within ${Math.max(0, margin).toFixed(0)}°F of saturating. Cold slabs and tools can sweat even if the probe is warmer.`,
        severity: margin <= 2 ? "warning" : "info",
      });
    }
  }

  const house = options.thermostatSnapshot;
  if (house?.ambientTempF != null && Number.isFinite(latest.tempf)) {
    const delta = house.ambientTempF - latest.tempf;
    if (delta >= 12) {
      insights.push({
        label: "Garage–house gap",
        detail: `House thermostat ${house.ambientTempF.toFixed(0)}°F vs probe ${latest.tempf.toFixed(1)}°F (${delta.toFixed(0)}°F warmer inside). Freeze alerts still apply to the unconditioned probe.`,
        severity: latest.tempf <= options.freezeThresholdF + 5 ? "warning" : "info",
      });
    }

    if (latest.tempf <= options.freezeThresholdF && house.ambientTempF > options.freezeThresholdF + 10) {
      insights.push({
        label: "Warm house, cold probe",
        detail: `Probe is at or below ${options.freezeThresholdF}°F while the house reads ${house.ambientTempF.toFixed(0)}°F — expected for an unheated garage or shop.`,
        severity: "info",
      });
    }

    if (isThermostatHeating(house.hvacMode) && latest.tempf < house.ambientTempF - 15) {
      insights.push({
        label: "HVAC heating",
        detail: `Furnace is on (house ${house.ambientTempF.toFixed(0)}°F) but the monitored space is unconditioned — it will stay colder than living areas.`,
        severity: "info",
      });
    }

    if (isThermostatCooling(house.hvacMode) && latest.tempf > house.ambientTempF + 10) {
      insights.push({
        label: "HVAC cooling",
        detail: `AC is running (house ${house.ambientTempF.toFixed(0)}°F). A hot garage or attic probe can still spike on sunny days.`,
        severity: "info",
      });
    }
  }

  return insights;
}
