import type { ChartPoint } from "./garageTempsHistory";

export type SeasonalInsight = {
  title: string;
  detail: string;
};

export function summarizeSeasonal(points: ChartPoint[], days: number): SeasonalInsight[] {
  if (points.length === 0) return [];

  const insights: SeasonalInsight[] = [];
  const coldest = points.reduce((a, b) => (a.tempf <= b.tempf ? a : b));
  const hottest = points.reduce((a, b) => (a.tempf >= b.tempf ? a : b));
  const wettest = points.reduce((a, b) => (a.humidity >= b.humidity ? a : b));
  const avgTemp =
    points.reduce((sum, p) => sum + p.tempf, 0) / points.length;

  insights.push({
    title: "Coldest reading",
    detail: `${coldest.tempf.toFixed(1)}°F on ${new Date(coldest.timestamp).toLocaleString()} (${coldest.probeLabel})`,
  });
  insights.push({
    title: "Warmest reading",
    detail: `${hottest.tempf.toFixed(1)}°F on ${new Date(hottest.timestamp).toLocaleString()} (${hottest.probeLabel})`,
  });
  insights.push({
    title: "Highest humidity",
    detail: `${wettest.humidity.toFixed(0)}% on ${new Date(wettest.timestamp).toLocaleString()} (${wettest.probeLabel})`,
  });
  insights.push({
    title: `${days}-day average`,
    detail: `${avgTemp.toFixed(1)}°F across ${points.length} readings`,
  });

  return insights;
}

export function compareProbeAverages(points: ChartPoint[]): string[] {
  const byProbe = new Map<string, number[]>();
  for (const point of points) {
    const list = byProbe.get(point.probeLabel) ?? [];
    list.push(point.tempf);
    byProbe.set(point.probeLabel, list);
  }

  if (byProbe.size < 2) return [];

  const averages = [...byProbe.entries()].map(([label, temps]) => ({
    label,
    avg: temps.reduce((a, b) => a + b, 0) / temps.length,
  }));

  averages.sort((a, b) => a.avg - b.avg);
  const coolest = averages[0];
  const warmest = averages[averages.length - 1];
  const delta = warmest.avg - coolest.avg;

  return [
    `${warmest.label} averages ${delta.toFixed(1)}°F warmer than ${coolest.label} in this window.`,
  ];
}

export async function computeSeasonalInsights(
  userId: string,
  days = 30,
): Promise<SeasonalInsight[]> {
  const { createServerClient } = await import("./supabase");
  const since = new Date();
  since.setDate(since.getDate() - days);

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("garage_temps")
    .select("tempf, humidity, timestamp, probe_label")
    .eq("user_id", userId)
    .gte("timestamp", since.toISOString())
    .order("timestamp", { ascending: true });

  if (error || !data || data.length === 0) {
    return [];
  }

  const points: ChartPoint[] = data.map((row) => ({
    timestamp: row.timestamp,
    tempf: Number(row.tempf),
    humidity: Number(row.humidity),
    probeLabel: row.probe_label?.trim() || "Probe",
  }));

  return summarizeSeasonal(points, days);
}
