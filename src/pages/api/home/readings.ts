import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { fetchTemps } from "../../../lib/FetchTemps";
import { getUserPreferences } from "../../../lib/userPreferences";
import { buildFeedDisplayGroups } from "../../../lib/tempFeedConfig";
import { getUserDevicesAsTempConfig } from "../../../lib/devices";
import { fetchLatestSensorValues } from "../../../lib/sensorReadings";
import type { SensorKind } from "../../../lib/devices";
import type { DeviceSource } from "../../../lib/devices";

export type LiveSensorCard = {
  deviceId: string;
  deviceName: string;
  deviceSource: DeviceSource | null;
  space: string | null;
  key: string;
  label: string;
  kind: SensorKind;
  unit: string | null;
  value_num: number | null;
  value_bool: boolean | null;
  value_text: string | null;
  recorded_at: string | null;
  /** Present for temperature probes when live feed data is available */
  temp?: { f: number; c: number; h: number } | null;
};

export const GET: APIRoute = async ({ cookies, url }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const save = url.searchParams.get("save") !== "0";
  const preferences = await getUserPreferences(user);
  const deviceConfig = await getUserDevicesAsTempConfig(user.id, user.email);
  const visibleProbes = preferences.tempProbes.filter((probe) => probe.visible);

  const results = await fetchTemps({
    feeds: preferences.tempFeeds.length > 0 ? preferences.tempFeeds : deviceConfig.feeds,
    probes: visibleProbes.length > 0 ? visibleProbes : deviceConfig.probes,
    devices: deviceConfig.devices,
    householdId: deviceConfig.householdId,
    saveToDatabase: save,
    userId: user.id,
    userEmail: user.email,
    userMetadata: user.user_metadata as Record<string, unknown>,
  });

  const groups = buildFeedDisplayGroups(
    preferences.tempFeeds.length > 0 ? preferences.tempFeeds : deviceConfig.feeds,
    preferences.tempProbes.length > 0 ? preferences.tempProbes : deviceConfig.probes,
    results,
  ).map((group) => ({
    feedId: group.feedId,
    feedName: group.feedName,
    enabled: group.enabled,
    error: group.error,
    probes: group.probes.map((probe) => ({
      key: probe.key,
      label: probe.label,
      data: probe.data
        ? { f: probe.data.f, c: probe.data.c, h: probe.data.h }
        : null,
    })),
  }));

  // Build kind-aware sensor cards from devices + latest DB values, overlay live temp
  const liveByKey = new Map<string, { f: number; c: number; h: number }>();
  for (const group of groups) {
    for (const probe of group.probes) {
      if (probe.data) {
        liveByKey.set(`${group.feedId}:${probe.key}`, probe.data);
        liveByKey.set(probe.key, probe.data);
      }
    }
  }

  const spaceFilter = url.searchParams.get("space")?.trim().toLowerCase() || null;
  const sensors: LiveSensorCard[] = [];

  for (const device of deviceConfig.devices.filter((d) => d.enabled)) {
    for (const sensor of device.sensors.filter((s) => s.visible)) {
      const liveTemp =
        sensor.kind === "temperature"
          ? liveByKey.get(`${device.id}:${sensor.key}`) ?? liveByKey.get(sensor.key)
          : null;

      sensors.push({
        deviceId: device.id,
        deviceName: device.name,
        deviceSource: device.source,
        space: device.space ?? null,
        key: sensor.key,
        label: sensor.label,
        kind: sensor.kind,
        unit: sensor.unit,
        value_num: liveTemp ? liveTemp.f : null,
        value_bool: null,
        value_text: null,
        recorded_at: null,
        temp:
          sensor.kind === "temperature"
            ? liveTemp ?? null
            : sensor.kind === "humidity" && liveTemp
              ? { f: liveTemp.f, c: liveTemp.c, h: liveTemp.h }
              : null,
      });
    }
  }

  if (deviceConfig.householdId) {
    const latest = await fetchLatestSensorValues(deviceConfig.householdId);
    for (const row of latest) {
      const existing = sensors.find(
        (s) => s.key === row.sensor.key && s.kind === row.sensor.kind && s.deviceName === row.deviceName,
      );
      if (existing) {
        if (existing.value_num == null) existing.value_num = row.value_num;
        existing.value_bool = row.value_bool;
        existing.value_text = row.value_text;
        existing.recorded_at = row.recorded_at;
        if (existing.kind === "humidity" && row.value_num != null && !existing.temp) {
          existing.value_num = row.value_num;
        }
      } else {
        sensors.push({
          deviceId: row.sensor.device_id,
          deviceName: row.deviceName,
          deviceSource:
            deviceConfig.devices.find((d) => d.id === row.sensor.device_id)?.source ??
            null,
          space:
            deviceConfig.devices.find((d) => d.id === row.sensor.device_id)?.space ??
            null,
          key: row.sensor.key,
          label: row.sensor.label,
          kind: row.sensor.kind,
          unit: row.sensor.unit,
          value_num: row.value_num,
          value_bool: row.value_bool,
          value_text: row.value_text,
          recorded_at: row.recorded_at,
          temp: null,
        });
      }
    }
  }

  // Pair humidity onto temperature cards for display convenience
  for (const sensor of sensors) {
    if (sensor.kind !== "temperature") continue;
    if (sensor.temp) continue;
    const humid = sensors.find(
      (s) =>
        s.kind === "humidity" &&
        s.key === sensor.key &&
        s.deviceId === sensor.deviceId,
    );
    if (sensor.value_num != null) {
      const f = sensor.value_num;
      const c = Number((((f - 32) * 5) / 9).toFixed(1));
      sensor.temp = {
        f,
        c,
        h: humid?.value_num ?? 0,
      };
    }
  }

  const filtered =
    spaceFilter == null
      ? sensors
      : sensors.filter(
          (s) => (s.space ?? "").toLowerCase() === spaceFilter,
        );

  return new Response(
    JSON.stringify({
      updatedAt: new Date().toISOString(),
      groups,
      sensors: filtered,
      spaces: [
        ...new Set(
          deviceConfig.devices
            .map((d) => d.space)
            .filter((s): s is string => Boolean(s?.trim())),
        ),
      ].sort(),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
};
