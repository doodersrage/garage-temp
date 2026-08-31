import { createServerClient } from "./supabase";
import { escapeCsvField } from "./csvEscape";
import { getUserHouseholdId } from "./households";
import { applySensorOffset } from "./sensorCalibration";

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
    offset_num?: number | null;
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
    const rawTempF = Number(tempRow.value_num);
    const tempOffset =
      typeof sensor.offset_num === "number" ? sensor.offset_num : 0;
    const tempf = applySensorOffset(rawTempF, tempOffset);
    const meta = tempRow.meta ?? {};
    const tempc =
      typeof meta.tempc === "number" && tempOffset === 0
        ? meta.tempc
        : Number((((tempf - 32) * 5) / 9).toFixed(1));
    const humidityRaw =
      humidityRow?.value_num != null
        ? Number(humidityRow.value_num)
        : typeof meta.humidity === "number"
          ? Number(meta.humidity)
          : 0;
    const humidityOffset =
      typeof humidityRow?.device_sensors?.offset_num === "number"
        ? humidityRow.device_sensors.offset_num
        : 0;
    const humidity = applySensorOffset(humidityRaw, humidityOffset);

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

  for (const [key, humidityRow] of humidities) {
    if (seen.has(key)) continue;
    const sensor = humidityRow.device_sensors!;
    const deviceName = sensor.devices?.name ?? "Device";
    readings.push({
      tempc: 0,
      tempf: 0,
      humidity: applySensorOffset(
        Number(humidityRow.value_num ?? 0),
        typeof sensor.offset_num === "number" ? sensor.offset_num : 0,
      ),
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
        offset_num,
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
  if (options.limit) {
    readings = readings.slice(0, options.limit);
  }
  return { readings, error: null };
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

  const all = fromSensor.readings;
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
  return fetchPairedFromSensorReadings(userId, filters, {
    ascending: false,
    limit: EXPORT_BATCH_SIZE,
  });
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

  const readings = [...fromSensor.readings].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  );

  const points: ChartPoint[] = readings.map((row) => ({
    timestamp: row.timestamp,
    tempf: Number(row.tempf),
    humidity: Number(row.humidity),
    probeLabel: row.probe_label?.trim() || row.probe_key || "Probe",
  }));

  // For windows beyond raw retention, fill gaps from hourly rollups.
  if (days > 90 || points.length < 10) {
    const householdId = await getUserHouseholdId(userId);
    const rollupPoints = householdId
      ? await fetchRollupChartPointsForHousehold(householdId, sinceIso, filters)
      : [];
    if (rollupPoints.length > 0) {
      const byTs = new Map(points.map((p) => [p.timestamp, p]));
      for (const point of rollupPoints) {
        if (!byTs.has(point.timestamp)) byTs.set(point.timestamp, point);
      }
      const merged = [...byTs.values()].sort(
        (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
      );
      return { points: merged, error: null };
    }
  }

  return { points, error: null };
}

async function fetchRollupChartPointsForHousehold(
  householdId: string,
  sinceIso: string,
  filters: HistoryFilters = {},
): Promise<ChartPoint[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("sensor_reading_rollups")
    .select(
      `
      bucket_start,
      avg_num,
      device_sensors!inner (
        key,
        label,
        kind,
        offset_num,
        devices!inner ( name )
      )
    `,
    )
    .eq("household_id", householdId)
    .gte("bucket_start", sinceIso)
    .order("bucket_start", { ascending: true })
    .limit(2000);

  if (error || !data) return [];

  const points: ChartPoint[] = [];
  for (const row of data as Array<{
    bucket_start: string;
    avg_num: number | null;
    device_sensors: {
      key: string;
      label: string;
      kind: string;
      offset_num?: number | null;
      devices: { name: string } | null;
    } | null;
  }>) {
    if (row.avg_num == null || row.device_sensors?.kind !== "temperature") continue;
    const probeLabel =
      row.device_sensors.label.replace(/ humidity$/i, "") ||
      row.device_sensors.key ||
      "Probe";
    const feedName = row.device_sensors.devices?.name ?? "Device";
    if (filters.feedName && feedName !== filters.feedName) continue;
    if (filters.probeKey && row.device_sensors.key !== filters.probeKey) continue;
    points.push({
      timestamp: row.bucket_start,
      tempf: applySensorOffset(
        Number(row.avg_num),
        typeof row.device_sensors.offset_num === "number"
          ? row.device_sensors.offset_num
          : 0,
      ),
      humidity: 0,
      probeLabel,
    });
  }
  return points;
}

export async function fetchHouseholdChartData(
  householdId: string,
  days = 7,
): Promise<{ points: ChartPoint[]; error: string | null }> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const supabase = createServerClient();
  const { data, error } = await supabase
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
        offset_num,
        devices!inner ( name )
      )
    `,
    )
    .eq("household_id", householdId)
    .gte("recorded_at", sinceIso)
    .order("recorded_at", { ascending: true })
    .limit(2000);

  if (error) {
    return { points: [], error: error.message };
  }

  const readings = pairTempHumidityRows(
    ((data ?? []) as SensorRow[]).filter((row) => {
      const kind = row.device_sensors?.kind;
      return kind === "temperature" || kind === "humidity";
    }),
    householdId,
  );

  let points: ChartPoint[] = readings.map((row) => ({
    timestamp: row.timestamp,
    tempf: Number(row.tempf),
    humidity: Number(row.humidity),
    probeLabel: row.probe_label?.trim() || row.probe_key || "Probe",
  }));

  if (points.length < 10) {
    const rollups = await fetchRollupChartPointsForHousehold(householdId, sinceIso);
    if (rollups.length > 0) {
      const byTs = new Map(points.map((p) => [p.timestamp, p]));
      for (const point of rollups) {
        if (!byTs.has(point.timestamp)) byTs.set(point.timestamp, point);
      }
      points = [...byTs.values()].sort(
        (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
      );
    }
  }

  return { points, error: null };
}

/** Chart points from the same calendar window one year earlier (rollups + raw). */
export async function fetchGarageTempChartDataPriorYear(
  userId: string,
  days = 30,
  filters: HistoryFilters = {},
): Promise<{ points: ChartPoint[]; error: string | null }> {
  const end = new Date();
  end.setFullYear(end.getFullYear() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - days);

  const priorFilters: HistoryFilters = {
    ...filters,
    from: start.toISOString(),
    to: end.toISOString(),
  };

  const fromSensor = await fetchPairedFromSensorReadings(userId, priorFilters, {
    ascending: true,
    limit: 500,
  });
  if (fromSensor.error) {
    return { points: [], error: fromSensor.error };
  }

  let points: ChartPoint[] = fromSensor.readings.map((row) => ({
    timestamp: row.timestamp,
    tempf: Number(row.tempf),
    humidity: Number(row.humidity),
    probeLabel: row.probe_label?.trim() || row.probe_key || "Probe",
  }));

  const householdId = await getUserHouseholdId(userId);
  const rollups = householdId
    ? await fetchRollupChartPointsForHousehold(
        householdId,
        start.toISOString(),
        priorFilters,
      )
    : [];
  const endMs = end.getTime();
  const filteredRollups = rollups.filter((p) => Date.parse(p.timestamp) <= endMs);
  if (filteredRollups.length > 0) {
    const byTs = new Map(points.map((p) => [p.timestamp, p]));
    for (const point of filteredRollups) {
      if (!byTs.has(point.timestamp)) byTs.set(point.timestamp, point);
    }
    points = [...byTs.values()].sort(
      (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
    );
  }

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

  const rows = fromSensor.readings;
  const feeds = [...new Set(rows.map((row) => getReadingFeedName(row)))];
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
