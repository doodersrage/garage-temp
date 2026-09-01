import { estimateTimeToFreeze, type TempSample } from "./timeToFreeze";

export type ThermalRunwayResult = ReturnType<typeof estimateTimeToFreeze> & {
  forecastAdjustedHours: number | null;
  annotations: string[];
};

/** Trend runway plus optional forecast / door context for alert copy. */
export function buildThermalRunway(input: {
  currentTempF: number;
  freezeThresholdF: number;
  recentSamples: TempSample[];
  forecastMinTempF?: number | null;
  forecastHoursAhead?: number;
  doorOpenNearby?: boolean;
}): ThermalRunwayResult {
  const base = estimateTimeToFreeze(
    input.currentTempF,
    input.freezeThresholdF,
    input.recentSamples,
  );

  const annotations: string[] = [];
  if (input.doorOpenNearby) {
    annotations.push("A door sensor is open — expect faster heat loss until it closes.");
  }

  let forecastAdjustedHours: number | null = null;
  if (
    input.forecastMinTempF != null &&
    Number.isFinite(input.forecastMinTempF) &&
    input.forecastMinTempF <= input.freezeThresholdF + 2
  ) {
    const ahead = input.forecastHoursAhead ?? 24;
    annotations.push(
      `Forecast low ~${input.forecastMinTempF.toFixed(1)}°F in the next ${ahead}h — outdoor cold may accelerate indoor cooling.`,
    );
    if (base.hours != null && base.hours > 0) {
      forecastAdjustedHours = Math.min(base.hours, ahead);
    }
  }

  return {
    ...base,
    forecastAdjustedHours,
    annotations,
  };
}

export function formatRunwayAlertSuffix(runway: ThermalRunwayResult): string | null {
  const parts: string[] = [];
  if (runway.hours != null && runway.hours > 0 && runway.rateFPerHour != null && runway.rateFPerHour < -0.05) {
    parts.push(`Thermal runway: ${runway.message}`);
  }
  if (runway.annotations.length > 0) {
    parts.push(...runway.annotations);
  }
  return parts.length > 0 ? parts.join("\n") : null;
}
