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

export async function fetchCrossPropertySnapshots(
  userId: string,
): Promise<{ properties: PropertySnapshot[]; error: string | null }> {
  const { households, error: listError } = await listUserHouseholds(userId);
  if (listError) return { properties: [], error: listError };

  const supabase = createServerClient();
  const settings = await getAlertSettingsForUser(userId);
  const threshold = settings.freezeThresholdF;
  const properties: PropertySnapshot[] = [];

  for (const household of households) {
    const { data: devices } = await supabase
      .from("devices")
      .select("id")
      .eq("household_id", household.household_id);

    const deviceIds = (devices ?? []).map((d) => d.id);
    let minTempF: number | null = null;
    let lastReadingAt: string | null = null;

    if (deviceIds.length > 0) {
      const { data: sensors } = await supabase
        .from("device_sensors")
        .select("id")
        .in("device_id", deviceIds)
        .eq("kind", "temperature");

      const sensorIds = (sensors ?? []).map((s) => s.id);
      if (sensorIds.length > 0) {
        const { data: readings } = await supabase
          .from("sensor_readings")
          .select("value_num, recorded_at")
          .eq("household_id", household.household_id)
          .in("sensor_id", sensorIds)
          .order("recorded_at", { ascending: false })
          .limit(50);

        for (const row of readings ?? []) {
          const val = row.value_num;
          if (val != null && Number.isFinite(val)) {
            minTempF = minTempF == null ? val : Math.min(minTempF, val);
          }
          if (!lastReadingAt && row.recorded_at) {
            lastReadingAt = row.recorded_at;
          }
        }
      }
    }

    properties.push({
      householdId: household.household_id,
      name: household.name,
      role: household.role,
      minTempF,
      freezeThresholdF: threshold,
      atRisk: minTempF != null && minTempF <= threshold,
      lastReadingAt,
      deviceCount: deviceIds.length,
    });
  }

  return { properties, error: null };
}
