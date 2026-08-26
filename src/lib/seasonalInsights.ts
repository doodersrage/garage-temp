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

export function compareYearOverYear(
  current: ChartPoint[],
  priorYear: ChartPoint[],
): SeasonalInsight | null {
  if (current.length === 0 || priorYear.length === 0) return null;
  const avg = (pts: ChartPoint[]) =>
    pts.reduce((sum, p) => sum + p.tempf, 0) / pts.length;
  const currentAvg = avg(current);
  const priorAvg = avg(priorYear);
  const delta = currentAvg - priorAvg;
  return {
    title: "Year-over-year",
    detail: `This window averages ${currentAvg.toFixed(1)}°F vs ${priorAvg.toFixed(1)}°F last year (${delta >= 0 ? "+" : ""}${delta.toFixed(1)}°F).`,
  };
}

export async function computeSeasonalInsights(
  userId: string,
  days = 30,
): Promise<SeasonalInsight[]> {
  const { fetchGarageTempChartData, fetchGarageTempChartDataPriorYear } =
    await import("./garageTempsHistory");
  const chart = await fetchGarageTempChartData(userId, days);
  if (chart.error || chart.points.length === 0) {
    return [];
  }
  const insights = summarizeSeasonal(chart.points, days);
  const prior = await fetchGarageTempChartDataPriorYear(userId, days);
  const yoy = compareYearOverYear(chart.points, prior.points);
  if (yoy) insights.push(yoy);
  return insights;
}
