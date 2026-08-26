import type { BatterySample } from "./batteryTrend";

export function batterySparklinePath(
  history: BatterySample[],
  width = 64,
  height = 20,
): string {
  if (history.length < 2) return "";
  const sorted = [...history].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const min = Math.min(...sorted.map((s) => s.pct));
  const max = Math.max(...sorted.map((s) => s.pct));
  const range = max - min || 1;

  return sorted
    .map((sample, index) => {
      const x = (index / (sorted.length - 1)) * width;
      const y = height - ((sample.pct - min) / range) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function parseBatteryHistory(meta: unknown): BatterySample[] {
  if (!meta || typeof meta !== "object") return [];
  const history = (meta as Record<string, unknown>).battery_history;
  if (!Array.isArray(history)) return [];
  return history.filter(
    (item): item is BatterySample =>
      !!item &&
      typeof item === "object" &&
      typeof (item as BatterySample).pct === "number" &&
      typeof (item as BatterySample).at === "string",
  );
}
