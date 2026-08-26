export type TempSample = { at: string; tempF: number };

/** Estimate hours until indoor temp hits freeze threshold from recent samples. */
export function estimateTimeToFreeze(
  currentTempF: number,
  freezeThresholdF: number,
  recentSamples: TempSample[],
): {
  hours: number | null;
  rateFPerHour: number | null;
  message: string;
} {
  if (currentTempF <= freezeThresholdF) {
    return {
      hours: 0,
      rateFPerHour: null,
      message: "Already at or below your freeze threshold.",
    };
  }

  const sorted = [...recentSamples]
    .filter((s) => Number.isFinite(s.tempF) && s.at)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  if (sorted.length < 2) {
    return {
      hours: null,
      rateFPerHour: null,
      message: "Need more recent readings to estimate a trend.",
    };
  }

  const oldest = sorted[0]!;
  const newest = sorted[sorted.length - 1]!;
  const elapsedHours =
    (Date.parse(newest.at) - Date.parse(oldest.at)) / (60 * 60 * 1000);

  if (elapsedHours < 0.25) {
    return {
      hours: null,
      rateFPerHour: null,
      message: "Readings are too close together for a trend.",
    };
  }

  const rateFPerHour = (newest.tempF - oldest.tempF) / elapsedHours;

  if (rateFPerHour >= -0.05) {
    return {
      hours: null,
      rateFPerHour,
      message:
        rateFPerHour > 0.1
          ? "Temperature is rising — no freeze risk from current trend."
          : "Temperature is stable — trend does not suggest imminent freeze.",
    };
  }

  const hours = (currentTempF - freezeThresholdF) / Math.abs(rateFPerHour);

  return {
    hours,
    rateFPerHour,
    message: `Cooling ~${Math.abs(rateFPerHour).toFixed(1)}°F/hr — roughly ${formatHours(hours)} until ${freezeThresholdF}°F at this rate.`,
  };
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} minutes`;
  if (hours < 48) return `${hours.toFixed(1)} hours`;
  return `${(hours / 24).toFixed(1)} days`;
}
