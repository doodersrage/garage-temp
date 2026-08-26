export type BatterySample = { pct: number; at: string };

export function appendBatterySample(
  history: unknown,
  pct: number,
  at = new Date().toISOString(),
  maxSamples = 14,
): BatterySample[] {
  const existing = Array.isArray(history)
    ? (history as BatterySample[]).filter(
        (s) => typeof s.pct === "number" && typeof s.at === "string",
      )
    : [];
  return [...existing, { pct, at }].slice(-maxSamples);
}

export function detectBatteryTrendDrop(
  history: BatterySample[],
  dropPct = 20,
  windowDays = 7,
): string | null {
  if (history.length < 2) return null;
  const sorted = [...history].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const newest = sorted[sorted.length - 1];
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const oldestInWindow = sorted.find((s) => Date.parse(s.at) >= cutoff) ?? sorted[0];
  const drop = oldestInWindow.pct - newest.pct;
  if (drop >= dropPct) {
    return `Battery dropped ${drop.toFixed(0)}% since ${new Date(oldestInWindow.at).toLocaleDateString()} (${oldestInWindow.pct}% → ${newest.pct}%).`;
  }
  return null;
}
