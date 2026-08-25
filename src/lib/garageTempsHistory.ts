import { createServerClient } from "./supabase";
import { getUserHouseholdId } from "./households";

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
  from?: string;
  to?: string;
};

export type ChartPoint = {
  timestamp: string;
  tempf: number;
  humidity: number;
  probeLabel: string;
};

type SensorRow = {
  recorded_at: string;
  value_num: number | null;
  meta: Record<string, unknown> | null;
  device_sensors: {
    key: string;
    label: string;
    kind: string;
    devices: {
      name: string;
    } | null;
  } | null;
};

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

function pairTempHumidityRows(
  rows: SensorRow[],
  userId: string,
): GarageTempReading[] {
  const temps = new Map<string, SensorRow>();
  const humidities = new Map<string, SensorRow>();

  for (const row of rows) {
    const sensor = row.device_sensors;
    if (!sensor || row.value_num == null) continue;
    const deviceName = sensor.devices?.name ?? "Device";
    const key = `${deviceName}::${sensor.key}::${row.recorded_at}`;
    if (sensor.kind === "temperature") temps.set(key, row);
    if (sensor.kind === "humidity") humidities.set(key, row);
  }

  const readings: GarageTempReading[] = [];
  const seen = new Set<string>();

  for (const [key, tempRow] of temps) {
    const sensor = tempRow.device_sensors!;
    const deviceName = sensor.devices?.name ?? "Device";
    const humidityRow = humidities.get(key);
    const tempf = Number(tempRow.value_num);
    const meta = tempRow.meta ?? {};
    const tempc =
      typeof meta.tempc === "number"
        ? meta.tempc
        : Number((((tempf - 32) * 5) / 9).toFixed(1));
    const humidity =
      humidityRow?.value_num != null
        ? Number(humidityRow.value_num)
        : typeof meta.humidity === "number"
          ? Number(meta.humidity)
          : 0;

    readings.push({
      tempc,
      tempf,
      humidity,
      timestamp: tempRow.recorded_at,
      feed_name: deviceName,
      probe_label: sensor.label.replace(/ humidity$/i, ""),
      probe_key: sensor.key,
      user_id: userId,
    });
    seen.add(key);
  }

  // Orphan humidity-only samples (unlikely)
  for (const [key, humidityRow] of humidities) {
    if (seen.has(key)) continue;
    const sensor = humidityRow.device_sensors!;
    const deviceName = sensor.devices?.name ?? "Device";
    readings.push({
      tempc: 0,
      tempf: 0,
      humidity: Number(humidityRow.value_num ?? 0),
      timestamp: humidityRow.recorded_at,
      feed_name: deviceName,
      probe_label: sensor.label.replace(/ humidity$/i, ""),
      probe_key: sensor.key,
      user_id: userId,
    });
  }

  readings.sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
  );
  return readings;
}

function matchesFilters(
  reading: GarageTempReading,
  filters: HistoryFilters,
): boolean {
  if (filters.feedName && getReadingFeedName(reading) !== filters.feedName) {
    return false;
  }
  if (filters.probeKey && (reading.probe_key?.trim() || "") !== filters.probeKey) {
    return false;
  }
  if (filters.from && Date.parse(reading.timestamp) < Date.parse(filters.from)) {
    return false;
  }
  if (filters.to && Date.parse(reading.timestamp) > Date.parse(filters.to)) {
    return false;
  }
  return true;
}

async function fetchPairedFromSensorReadings(
  userId: string,
  filters: HistoryFilters = {},
  options: { limit?: number; ascending?: boolean } = {},
): Promise<{ readings: GarageTempReading[]; error: string | null }> {
  const householdId = await getUserHouseholdId(userId);
  if (!householdId) {
    return { readings: [], error: null };
  }

  const supabase = createServerClient();
  let query = supabase
    .from("sensor_readings")
    .select(
      `
      recorded_at,
      value_num,
      meta,
      device_sensors!inner (
        key,
        label,
        kind,
        devices!inner (
          name
        )
      )
    `,
    )
    .eq("household_id", householdId);

  if (filters.from) {
    query = query.gte("recorded_at", filters.from);
  }
  if (filters.to) {
    query = query.lte("recorded_at", filters.to);
  }

  query = query.order("recorded_at", {
    ascending: options.ascending === true,
  });

  if (options.limit) {
    // Fetch extra raw rows so paired temp+humidity samples still fill the limit
    query = query.limit(Math.max(options.limit * 4, 200));
  }

  const { data, error } = await query;

  if (error) {
    return { readings: [], error: error.message };
  }

  const filteredKinds = ((data ?? []) as SensorRow[]).filter((row) => {
    const kind = row.device_sensors?.kind;
    return kind === "temperature" || kind === "humidity";
  });

  let readings = pairTempHumidityRows(filteredKinds, userId);
  readings = readings.filter((reading) => matchesFilters(reading, filters));
  if (options.limit && options.ascending) {
    readings = readings.slice(0, options.limit);
  } else if (options.limit) {
    readings = readings.slice(0, options.limit);
  }
  return { readings, error: null };
}

/** Legacy fallback while older rows still exist only in garage_temps. */
async function fetchPairedFromGarageTemps(
  userId: string,
  filters: HistoryFilters = {},
  options: { limit?: number; ascending?: boolean; range?: [number, number] } = {},
): Promise<{
  readings: GarageTempReading[];
  totalCount?: number;
  error: string | null;
}> {
  const supabase = createServerClient();
  let query = supabase
    .from("garage_temps")
    .select(
      "tempc, tempf, humidity, timestamp, feed_name, probe_label, probe_key, user_id",
      { count: "exact" },
    )
    .eq("user_id", userId);

  if (filters.feedName) query = query.eq("feed_name", filters.feedName);
  if (filters.probeKey) query = query.eq("probe_key", filters.probeKey);
  if (filters.from) query = query.gte("timestamp", filters.from);
  if (filters.to) query = query.lte("timestamp", filters.to);

  query = query.order("timestamp", { ascending: options.ascending === true });

  if (options.range) {
    query = query.range(options.range[0], options.range[1]);
  } else if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error, count } = await query;
  if (error) {
    return { readings: [], error: error.message };
  }

  return {
    readings: (data ?? []) as GarageTempReading[],
    totalCount: count ?? undefined,
    error: null,
  };
}

export async function fetchGarageTempHistory(
  userId: string,
  page = 1,
  pageSize = GARAGE_TEMPS_PAGE_SIZE,
  filters: HistoryFilters = {},
): Promise<PaginatedGarageTemps> {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

  const fromSensor = await fetchPairedFromSensorReadings(userId, filters, {
    ascending: false,
  });

  if (fromSensor.error) {
    return {
      readings: [],
      page: safePage,
      pageSize,
      totalCount: 0,
      totalPages: 0,
      error: fromSensor.error,
    };
  }

  let all = fromSensor.readings;

  // Fall back / merge legacy rows not represented in sensor_readings
  if (all.length === 0) {
    const legacy = await fetchPairedFromGarageTemps(userId, filters, {
      ascending: false,
    });
    if (legacy.error) {
      return {
        readings: [],
        page: safePage,
        pageSize,
        totalCount: 0,
        totalPages: 0,
        error: legacy.error,
      };
    }
    all = legacy.readings;
  }

  const totalCount = all.length;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
  const start = (safePage - 1) * pageSize;

  return {
    readings: all.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    totalCount,
    totalPages,
    error: null,
  };
}

const EXPORT_BATCH_SIZE = 5000;

export async function fetchAllGarageTempReadings(
  userId: string,
  filters: HistoryFilters = {},
): Promise<{
  readings: GarageTempReading[];
  error: string | null;
}> {
  const fromSensor = await fetchPairedFromSensorReadings(userId, filters, {
    ascending: false,
    limit: EXPORT_BATCH_SIZE,
  });

  if (fromSensor.error) {
    return { readings: [], error: fromSensor.error };
  }

  if (fromSensor.readings.length > 0) {
    return fromSensor;
  }

  return fetchPairedFromGarageTemps(userId, filters, { ascending: false });
}

export async function fetchGarageTempChartData(
  userId: string,
  days = 7,
  filters: HistoryFilters = {},
): Promise<{ points: ChartPoint[]; error: string | null }> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = filters.from ?? since.toISOString();
  const chartFilters = { ...filters, from: sinceIso };

  const fromSensor = await fetchPairedFromSensorReadings(userId, chartFilters, {
    ascending: true,
    limit: 500,
  });

  if (fromSensor.error) {
    return { points: [], error: fromSensor.error };
  }

  let readings = fromSensor.readings;
  if (readings.length === 0) {
    const legacy = await fetchPairedFromGarageTemps(userId, chartFilters, {
      ascending: true,
      limit: 500,
    });
    if (legacy.error) {
      return { points: [], error: legacy.error };
    }
    readings = legacy.readings;
  }

  // Chronological for charts
  readings = [...readings].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  );

  const points: ChartPoint[] = readings.map((row) => ({
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
  const fromSensor = await fetchPairedFromSensorReadings(userId, {}, {
    ascending: false,
    limit: 500,
  });

  if (fromSensor.error) {
    return { feeds: [], probes: [], error: fromSensor.error };
  }

  let rows = fromSensor.readings;
  if (rows.length === 0) {
    const legacy = await fetchPairedFromGarageTemps(userId, {}, {
      ascending: false,
      limit: 500,
    });
    if (legacy.error) {
      return { feeds: [], probes: [], error: legacy.error };
    }
    rows = legacy.readings;
  }

  const feeds = [
    ...new Set(rows.map((row) => getReadingFeedName(row))),
  ];
  const probeMap = new Map<string, string>();

  for (const row of rows) {
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
