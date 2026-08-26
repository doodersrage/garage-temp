import { createServerClient } from "./supabase";
import { getOrCreateHouseholdForUser, getUserHouseholdId } from "./households";
import {
  getDefaultTempFeeds,
  getDefaultTempProbes,
  type TempFeedConfig,
  type TempProbeConfig,
} from "./tempFeedConfig";

export type SensorKind =
  | "temperature"
  | "humidity"
  | "co2"
  | "door"
  | "power"
  | "flood"
  | "generic";

export type DeviceSource = "pull_url" | "push";

export type Device = {
  id: string;
  household_id: string;
  name: string;
  source: DeviceSource;
  pull_url: string | null;
  ingest_key_prefix: string | null;
  enabled: boolean;
  last_seen_at: string | null;
  sort_order: number;
  meta?: Record<string, unknown>;
};

export type DeviceSensor = {
  id: string;
  device_id: string;
  key: string;
  label: string;
  kind: SensorKind;
  unit: string | null;
  visible: boolean;
  sort_order: number;
};

export type DeviceWithSensors = Device & { sensors: DeviceSensor[] };

const DEVICE_SELECT =
  "id, household_id, name, source, pull_url, ingest_key_prefix, enabled, last_seen_at, sort_order, meta";
const SENSOR_SELECT =
  "id, device_id, key, label, kind, unit, visible, sort_order";

export async function listHouseholdDevices(
  householdId: string,
): Promise<{ devices: DeviceWithSensors[]; error: string | null }> {
  const supabase = createServerClient();
  const { data: devices, error } = await supabase
    .from("devices")
    .select(DEVICE_SELECT)
    .eq("household_id", householdId)
    .order("sort_order", { ascending: true });

  if (error) {
    return { devices: [], error: error.message };
  }

  if (!devices || devices.length === 0) {
    return { devices: [], error: null };
  }

  const ids = devices.map((d) => d.id);
  const { data: sensors, error: sensorError } = await supabase
    .from("device_sensors")
    .select(SENSOR_SELECT)
    .in("device_id", ids)
    .order("sort_order", { ascending: true });

  if (sensorError) {
    return { devices: [], error: sensorError.message };
  }

  const byDevice = new Map<string, DeviceSensor[]>();
  for (const sensor of sensors ?? []) {
    const list = byDevice.get(sensor.device_id) ?? [];
    list.push(sensor as DeviceSensor);
    byDevice.set(sensor.device_id, list);
  }

  return {
    devices: devices.map((device) => ({
      ...(device as Device),
      sensors: byDevice.get(device.id) ?? [],
    })),
    error: null,
  };
}

export async function ensureDefaultPullDevice(
  userId: string,
  email?: string | null,
): Promise<{ householdId: string; devices: DeviceWithSensors[]; error: string | null }> {
  const household = await getOrCreateHouseholdForUser(userId, email);
  if (household.error || !household.householdId) {
    return { householdId: "", devices: [], error: household.error };
  }

  const existing = await listHouseholdDevices(household.householdId);
  if (existing.error) {
    return { householdId: household.householdId, devices: [], error: existing.error };
  }

  if (existing.devices.length > 0) {
    return {
      householdId: household.householdId,
      devices: existing.devices,
      error: null,
    };
  }

  const defaultFeeds = getDefaultTempFeeds();
  const defaultProbes = getDefaultTempProbes();
  const feed = defaultFeeds[0];

  if (!feed) {
    return { householdId: household.householdId, devices: [], error: null };
  }

  const supabase = createServerClient();
  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .insert({
      household_id: household.householdId,
      name: feed.name,
      source: "pull_url",
      pull_url: feed.url,
      enabled: true,
      sort_order: 0,
    })
    .select(DEVICE_SELECT)
    .single();

  if (deviceError || !device) {
    return {
      householdId: household.householdId,
      devices: [],
      error: deviceError?.message ?? "Failed to create default device",
    };
  }

  const sensorRows = defaultProbes.flatMap((probe, index) => [
    {
      device_id: device.id,
      key: probe.key,
      label: probe.label,
      kind: "temperature" as const,
      unit: "F",
      visible: probe.visible,
      sort_order: index,
    },
    {
      device_id: device.id,
      key: probe.key,
      label: `${probe.label} humidity`,
      kind: "humidity" as const,
      unit: "%",
      visible: probe.visible,
      sort_order: index,
    },
  ]);

  if (sensorRows.length > 0) {
    await supabase.from("device_sensors").insert(sensorRows);
  }

  const refreshed = await listHouseholdDevices(household.householdId);
  return {
    householdId: household.householdId,
    devices: refreshed.devices,
    error: refreshed.error,
  };
}

/** Map devices to legacy TempFeedConfig / TempProbeConfig for pull compatibility. */
export function devicesToTempConfig(devices: DeviceWithSensors[]): {
  feeds: TempFeedConfig[];
  probes: TempProbeConfig[];
} {
  const pullDevices = devices.filter((d) => d.source === "pull_url" && d.pull_url);

  const feeds: TempFeedConfig[] = pullDevices.map((device) => ({
    id: device.id,
    name: device.name,
    url: device.pull_url!,
    enabled: device.enabled,
  }));

  const probes: TempProbeConfig[] = [];
  const seen = new Set<string>();

  for (const device of pullDevices) {
    for (const sensor of device.sensors) {
      if (sensor.kind !== "temperature") continue;
      const id = `${device.id}:${sensor.key}`;
      if (seen.has(id)) continue;
      seen.add(id);
      probes.push({
        id,
        feedId: device.id,
        key: sensor.key,
        label: sensor.label.replace(/ humidity$/i, ""),
        visible: sensor.visible,
      });
    }
  }

  return { feeds, probes };
}

export async function getUserDevicesAsTempConfig(userId: string, email?: string | null) {
  const ensured = await ensureDefaultPullDevice(userId, email);
  if (ensured.error) {
    return {
      householdId: ensured.householdId,
      devices: [] as DeviceWithSensors[],
      feeds: getDefaultTempFeeds(),
      probes: getDefaultTempProbes(),
      error: ensured.error,
    };
  }

  const { feeds, probes } = devicesToTempConfig(ensured.devices);
  const hasDevices = ensured.devices.length > 0;
  return {
    householdId: ensured.householdId,
    devices: ensured.devices,
    // Push-only households must not fall back to the public demo feed.
    feeds: feeds.length > 0 ? feeds : hasDevices ? [] : getDefaultTempFeeds(),
    probes: probes.length > 0 ? probes : hasDevices ? [] : getDefaultTempProbes(),
    error: null as string | null,
  };
}

export async function touchDeviceLastSeen(deviceId: string): Promise<void> {
  const supabase = createServerClient();
  await supabase
    .from("devices")
    .update({ last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", deviceId);
}

export async function updateDeviceMeta(
  deviceId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("devices")
    .select("meta")
    .eq("id", deviceId)
    .maybeSingle();
  const existing =
    data?.meta && typeof data.meta === "object" && !Array.isArray(data.meta)
      ? (data.meta as Record<string, unknown>)
      : {};
  await supabase
    .from("devices")
    .update({
      meta: { ...existing, ...patch },
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", deviceId);
}

export async function findDeviceByIngestKeyHash(
  keyHash: string,
): Promise<DeviceWithSensors | null> {
  const supabase = createServerClient();
  const { data: device } = await supabase
    .from("devices")
    .select(DEVICE_SELECT)
    .eq("ingest_key_hash", keyHash)
    .eq("enabled", true)
    .maybeSingle();

  if (!device) return null;

  const { data: sensors } = await supabase
    .from("device_sensors")
    .select(SENSOR_SELECT)
    .eq("device_id", device.id)
    .order("sort_order", { ascending: true });

  return {
    ...(device as Device),
    sensors: (sensors ?? []) as DeviceSensor[],
  };
}

export async function createPushDevice(
  householdId: string,
  name: string,
  ingestKeyHash: string,
  ingestKeyPrefix: string,
): Promise<{ device: Device | null; error: string | null }> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("devices")
    .insert({
      household_id: householdId,
      name,
      source: "push",
      ingest_key_hash: ingestKeyHash,
      ingest_key_prefix: ingestKeyPrefix,
      enabled: true,
    })
    .select(DEVICE_SELECT)
    .single();

  if (error || !data) {
    return { device: null, error: error?.message ?? "Failed to create device" };
  }

  return { device: data as Device, error: null };
}

export async function renamePushDevice(
  householdId: string,
  deviceId: string,
  name: string,
): Promise<{ error: string | null }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Name is required" };
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("devices")
    .update({ name: trimmed })
    .eq("id", deviceId)
    .eq("household_id", householdId)
    .eq("source", "push")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: error?.message ?? "Failed to rename device" };
  }

  return { error: null };
}

export async function rotatePushDeviceKey(
  householdId: string,
  deviceId: string,
  ingestKeyHash: string,
  ingestKeyPrefix: string,
): Promise<{ error: string | null }> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("devices")
    .update({
      ingest_key_hash: ingestKeyHash,
      ingest_key_prefix: ingestKeyPrefix,
    })
    .eq("id", deviceId)
    .eq("household_id", householdId)
    .eq("source", "push")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: error?.message ?? "Failed to rotate key" };
  }

  return { error: null };
}

export async function updateDeviceSensor(
  sensorId: string,
  deviceId: string,
  patch: {
    key: string;
    label: string;
    kind: SensorKind;
    unit?: string | null;
  },
): Promise<{ error: string | null }> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("device_sensors")
    .update({
      key: patch.key,
      label: patch.label,
      kind: patch.kind,
      unit: patch.unit ?? null,
    })
    .eq("id", sensorId)
    .eq("device_id", deviceId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function deleteDeviceSensor(
  sensorId: string,
  deviceId: string,
): Promise<{ error: string | null }> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("device_sensors")
    .delete()
    .eq("id", sensorId)
    .eq("device_id", deviceId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function upsertDeviceSensor(
  deviceId: string,
  key: string,
  label: string,
  kind: SensorKind,
  unit?: string | null,
): Promise<{ sensor: DeviceSensor | null; error: string | null }> {
  const supabase = createServerClient();
  const { data: existing } = await supabase
    .from("device_sensors")
    .select(SENSOR_SELECT)
    .eq("device_id", deviceId)
    .eq("key", key)
    .eq("kind", kind)
    .maybeSingle();

  if (existing) {
    return { sensor: existing as DeviceSensor, error: null };
  }

  const { data, error } = await supabase
    .from("device_sensors")
    .insert({
      device_id: deviceId,
      key,
      label,
      kind,
      unit: unit ?? null,
      visible: true,
    })
    .select(SENSOR_SELECT)
    .single();

  if (error || !data) {
    return { sensor: null, error: error?.message ?? "Failed to create sensor" };
  }

  return { sensor: data as DeviceSensor, error: null };
}

export async function savePullDevicesForHousehold(
  householdId: string,
  feeds: TempFeedConfig[],
  probes: TempProbeConfig[],
): Promise<{ error: string | null }> {
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("devices")
    .select("id")
    .eq("household_id", householdId)
    .eq("source", "pull_url");

  const existingIds = (existing ?? []).map((row) => row.id);
  if (existingIds.length > 0) {
    await supabase.from("device_sensors").delete().in("device_id", existingIds);
    await supabase.from("devices").delete().in("id", existingIds);
  }

  for (const [index, feed] of feeds.entries()) {
    const { data: device, error } = await supabase
      .from("devices")
      .insert({
        household_id: householdId,
        name: feed.name,
        source: "pull_url",
        pull_url: feed.url,
        enabled: feed.enabled,
        sort_order: index,
      })
      .select("id")
      .single();

    if (error || !device) {
      return { error: error?.message ?? "Failed to save device" };
    }

    const feedProbes = probes.filter((probe) => probe.feedId === feed.id);
    const rows = feedProbes.flatMap((probe, probeIndex) => [
      {
        device_id: device.id,
        key: probe.key,
        label: probe.label,
        kind: "temperature" as const,
        unit: "F",
        visible: probe.visible,
        sort_order: probeIndex,
      },
      {
        device_id: device.id,
        key: probe.key,
        label: `${probe.label} humidity`,
        kind: "humidity" as const,
        unit: "%",
        visible: probe.visible,
        sort_order: probeIndex,
      },
    ]);

    if (rows.length > 0) {
      const { error: sensorError } = await supabase.from("device_sensors").insert(rows);
      if (sensorError) {
        return { error: sensorError.message };
      }
    }
  }

  return { error: null };
}

export async function getHouseholdIdForUser(userId: string): Promise<string | null> {
  return getUserHouseholdId(userId);
}
