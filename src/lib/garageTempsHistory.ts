import { createServerClient } from "./supabase";

export type GarageTempReading = {
  tempc: number;
  tempf: number;
  humidity: number;
  timestamp: string;
  feed_name?: string | null;
  probe_label?: string | null;
  probe_key?: string | null;
  user_id?: string | null;
};

export type PaginatedGarageTemps = {
  readings: GarageTempReading[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  error: string | null;
};

export const GARAGE_TEMPS_PAGE_SIZE = 20;

export type HistoryFilters = {
  feedName?: string;
  probeKey?: string;
};

export type ChartPoint = {
  timestamp: string;
  tempf: number;
  humidity: number;
  probeLabel: string;
};

const HISTORY_SELECT =
  "tempc, tempf, humidity, timestamp, feed_name, probe_label, probe_key, user_id";

export function formatReadingTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function getReadingFeedName(reading: GarageTempReading): string {
  return reading.feed_name?.trim() || "Garage";
}

export function getReadingProbeLabel(reading: GarageTempReading): string {
  return reading.probe_label?.trim() || "Average";
}

export async function fetchGarageTempHistory(
  userId: string,
  page = 1,
  pageSize = GARAGE_TEMPS_PAGE_SIZE,
  filters: HistoryFilters = {},
): Promise<PaginatedGarageTemps> {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createServerClient();
  let query = supabase
    .from("garage_temps")
    .select(HISTORY_SELECT, { count: "exact" })
    .eq("user_id", userId);

  if (filters.feedName) {
    query = query.eq("feed_name", filters.feedName);
  }

  if (filters.probeKey) {
    query = query.eq("probe_key", filters.probeKey);
  }

  const { data, error, count } = await query
    .order("timestamp", { ascending: false })
    .range(from, to);

  if (error) {
    return {
      readings: [],
      page: safePage,
      pageSize,
      totalCount: 0,
      totalPages: 0,
      error: error.message,
    };
  }

  const totalCount = count ?? 0;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

  return {
    readings: (data ?? []) as GarageTempReading[],
    page: safePage,
    pageSize,
    totalCount,
    totalPages,
    error: null,
  };
}

const EXPORT_BATCH_SIZE = 1000;

export async function fetchAllGarageTempReadings(userId: string): Promise<{
  readings: GarageTempReading[];
  error: string | null;
}> {
  const supabase = createServerClient();
  const readings: GarageTempReading[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("garage_temps")
      .select(HISTORY_SELECT)
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .range(from, from + EXPORT_BATCH_SIZE - 1);

    if (error) {
      return { readings: [], error: error.message };
    }

    if (!data || data.length === 0) {
      break;
    }

    readings.push(...(data as GarageTempReading[]));

    if (data.length < EXPORT_BATCH_SIZE) {
      break;
    }

    from += EXPORT_BATCH_SIZE;
  }

  return { readings, error: null };
}

export async function fetchGarageTempChartData(
  userId: string,
  days = 7,
  filters: HistoryFilters = {},
): Promise<{ points: ChartPoint[]; error: string | null }> {
  const supabase = createServerClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  let query = supabase
    .from("garage_temps")
    .select("tempf, humidity, timestamp, probe_label, probe_key")
    .eq("user_id", userId)
    .gte("timestamp", since.toISOString());

  if (filters.feedName) {
    query = query.eq("feed_name", filters.feedName);
  }

  if (filters.probeKey) {
    query = query.eq("probe_key", filters.probeKey);
  }

  const { data, error } = await query.order("timestamp", { ascending: true }).limit(500);

  if (error) {
    return { points: [], error: error.message };
  }

  const points: ChartPoint[] = (data ?? []).map((row) => ({
    timestamp: row.timestamp,
    tempf: Number(row.tempf),
    humidity: Number(row.humidity),
    probeLabel: row.probe_label?.trim() || row.probe_key || "Probe",
  }));

  return { points, error: null };
}

export async function fetchHistoryFilterOptions(userId: string): Promise<{
  feeds: string[];
  probes: { key: string; label: string }[];
  error: string | null;
}> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("garage_temps")
    .select("feed_name, probe_key, probe_label")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
    .limit(500);

  if (error) {
    return { feeds: [], probes: [], error: error.message };
  }

  const feeds = [...new Set((data ?? []).map((row) => row.feed_name?.trim() || "Garage"))];
  const probeMap = new Map<string, string>();

  for (const row of data ?? []) {
    const key = row.probe_key?.trim();
    if (!key || probeMap.has(key)) continue;
    probeMap.set(key, row.probe_label?.trim() || key);
  }

  return {
    feeds,
    probes: [...probeMap.entries()].map(([key, label]) => ({ key, label })),
    error: null,
  };
}

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildGarageTempsCsv(readings: GarageTempReading[]): string {
  const headers = [
    "recorded_at",
    "feed_name",
    "probe_label",
    "probe_key",
    "temperature_f",
    "temperature_c",
    "humidity_percent",
  ];

  const rows = readings.map((reading) =>
    [
      new Date(reading.timestamp).toISOString(),
      getReadingFeedName(reading),
      getReadingProbeLabel(reading),
      reading.probe_key?.trim() || "",
      Number(reading.tempf).toFixed(1),
      Number(reading.tempc).toFixed(1),
      Number(reading.humidity).toFixed(1),
    ]
      .map(escapeCsvField)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}
