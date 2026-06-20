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
