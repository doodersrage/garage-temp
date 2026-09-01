import { createServerClient } from "./supabase";
import type { DeviceWithSensors } from "./devices";

export type IndoorReferenceOption = {
  sensorId: string;
  label: string;
  deviceName: string;
};

export async function getIndoorReferenceSensorId(
  householdId: string,
): Promise<string | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("households")
    .select("indoor_reference_sensor_id")
    .eq("id", householdId)
    .maybeSingle();

  if (error) {
    console.error("getIndoorReferenceSensorId failed:", error.message);
    return null;
  }

  return data?.indoor_reference_sensor_id ?? null;
}

export async function updateIndoorReferenceSensor(
  householdId: string,
  sensorId: string | null,
): Promise<{ error: string | null }> {
  const supabase = createServerClient();

  if (sensorId) {
    const { data: sensor, error: lookupError } = await supabase
      .from("device_sensors")
      .select("id, kind, devices!inner ( household_id )")
      .eq("id", sensorId)
      .maybeSingle();

    if (lookupError) {
      return { error: lookupError.message };
    }

    const device = sensor?.devices as { household_id?: string } | null;
    if (
      !sensor ||
      sensor.kind !== "temperature" ||
      device?.household_id !== householdId
    ) {
      return { error: "Choose a temperature sensor from this household." };
    }
  }

  const { error } = await supabase
    .from("households")
    .update({ indoor_reference_sensor_id: sensorId })
    .eq("id", householdId);

  return { error: error?.message ?? null };
}

export function listIndoorReferenceOptions(
  devices: DeviceWithSensors[],
): IndoorReferenceOption[] {
  const options: IndoorReferenceOption[] = [];
  for (const device of devices) {
    for (const sensor of device.sensors) {
      if (sensor.kind !== "temperature" || !sensor.visible) continue;
      options.push({
        sensorId: sensor.id,
        label: sensor.label,
        deviceName: device.name,
      });
    }
  }
  return options.sort((a, b) =>
    `${a.deviceName} ${a.label}`.localeCompare(`${b.deviceName} ${b.label}`),
  );
}

export function findReferenceSensorLabel(
  devices: DeviceWithSensors[],
  sensorId: string | null,
): string | null {
  if (!sensorId) return null;
  for (const device of devices) {
    for (const sensor of device.sensors) {
      if (sensor.id === sensorId) {
        return sensor.label;
      }
    }
  }
  return null;
}
