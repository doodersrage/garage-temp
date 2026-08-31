import { createServerClient } from "./supabase";
import { listUserHouseholds, type UserHousehold } from "./households";
import { getAlertSettingsForUser } from "./notify";

export type PropertySnapshot = {
  householdId: string;
  name: string;
  role: UserHousehold["role"];
  minTempF: number | null;
  freezeThresholdF: number;
  atRisk: boolean;
  lastReadingAt: string | null;
  deviceCount: number;
};

/**
 * How far back to look when computing each property's current minimum
 * temperature and last-reading time. This used to be "the last 50 raw
 * readings per household," fetched with up to 3 sequential Supabase queries
 * *per household* in a loop -- fine at a handful of properties, but with
 * Portfolio's 500-owned-household ceiling that could mean up to ~1,500
 * sequential round-trips loading one dashboard (and the same cost again on
 * every portfolioAlerts.ts cron run, once per portfolio owner). A bounded
 * time window lets every household's data come back in 3 bulk queries
 * total regardless of property count. It's also arguably more correct: "last
 * 50 readings" could reach back days for an intermittently-reporting
 * device, showing a stale minimum as if it were current.
 */
const RECENT_READING_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours
/**
 * Safety-net cap on rows pulled within the window, purely to bound worst-case
 * query cost for a portfolio with many high-frequency sensors. If a
 * household's true minimum within the window falls outside this cap (only
 * possible with an extremely chatty fleet), it may be missed -- an accepted
 * trade-off for turning O(properties) sequential queries into O(1).
 */
const RECENT_READING_ROW_CAP = 20000;

export async function fetchCrossPropertySnapshots(
  userId: string,
): Promise<{ properties: PropertySnapshot[]; error: string | null }> {
  const { households, error: listError } = await listUserHouseholds(userId);
  if (listError) return { properties: [], error: listError };
  if (households.length === 0) return { properties: [], error: null };

  const supabase = createServerClient();
  const settings = await getAlertSettingsForUser(userId);
  const threshold = settings.freezeThresholdF;
  const householdIds = households.map((h) => h.household_id);

  const { data: devices } = await supabase
    .from("devices")
    .select("id, household_id")
    .in("household_id", householdIds);

  const deviceCountByHousehold = new Map<string, number>();
  const householdIdByDevice = new Map<string, string>();
  for (const device of devices ?? []) {
    householdIdByDevice.set(device.id, device.household_id);
    deviceCountByHousehold.set(
      device.household_id,
      (deviceCountByHousehold.get(device.household_id) ?? 0) + 1,
    );
  }

  const allDeviceIds = [...householdIdByDevice.keys()];
  const temperatureSensorIds: string[] = [];

  if (allDeviceIds.length > 0) {
    const { data: sensors } = await supabase
      .from("device_sensors")
      .select("id, device_id")
      .in("device_id", allDeviceIds)
      .eq("kind", "temperature");

    for (const sensor of sensors ?? []) {
      temperatureSensorIds.push(sensor.id);
    }
  }

  const minTempByHousehold = new Map<string, number>();
  const lastReadingByHousehold = new Map<string, string>();

  if (temperatureSensorIds.length > 0) {
    const cutoff = new Date(Date.now() - RECENT_READING_WINDOW_MS).toISOString();
    const { data: readings } = await supabase
      .from("sensor_readings")
      .select("household_id, value_num, recorded_at")
      .in("household_id", householdIds)
      .in("sensor_id", temperatureSensorIds)
      .gte("recorded_at", cutoff)
      .order("recorded_at", { ascending: false })
      .limit(RECENT_READING_ROW_CAP);

    for (const row of readings ?? []) {
      const val = row.value_num;
      if (val != null && Number.isFinite(val)) {
        const current = minTempByHousehold.get(row.household_id);
        if (current == null || val < current) {
          minTempByHousehold.set(row.household_id, val);
        }
      }
      // Rows are ordered by recorded_at desc, so the first row seen for a
      // household is its most recent reading.
      if (row.recorded_at && !lastReadingByHousehold.has(row.household_id)) {
        lastReadingByHousehold.set(row.household_id, row.recorded_at);
      }
    }
  }

  const properties: PropertySnapshot[] = households.map((household) => {
    const minTempF = minTempByHousehold.get(household.household_id) ?? null;
    return {
      householdId: household.household_id,
      name: household.name,
      role: household.role,
      minTempF,
      freezeThresholdF: threshold,
      atRisk: minTempF != null && minTempF <= threshold,
      lastReadingAt: lastReadingByHousehold.get(household.household_id) ?? null,
      deviceCount: deviceCountByHousehold.get(household.household_id) ?? 0,
    };
  });

  return { properties, error: null };
}
