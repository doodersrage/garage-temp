import { createServerClient } from "./supabase";

export type GarageTempReading = {
  tempc: number;
  tempf: number;
  humidity: number;
  timestamp: string;
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

export function formatReadingTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export async function fetchGarageTempHistory(
  page = 1,
  pageSize = GARAGE_TEMPS_PAGE_SIZE,
): Promise<PaginatedGarageTemps> {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createServerClient();
  const { data, error, count } = await supabase
    .from("garage_temps")
    .select("tempc, tempf, humidity, timestamp", { count: "exact" })
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

export async function fetchAllGarageTempReadings(): Promise<{
  readings: GarageTempReading[];
  error: string | null;
}> {
  const supabase = createServerClient();
  const readings: GarageTempReading[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("garage_temps")
      .select("tempc, tempf, humidity, timestamp")
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
    "temperature_f",
    "temperature_c",
    "humidity_percent",
  ];

  const rows = readings.map((reading) =>
    [
      new Date(reading.timestamp).toISOString(),
      Number(reading.tempf).toFixed(1),
      Number(reading.tempc).toFixed(1),
      Number(reading.humidity).toFixed(1),
    ]
      .map(escapeCsvField)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}
