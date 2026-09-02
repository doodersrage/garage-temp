import type { SensorKind } from "./sensorKinds";
import { defaultUnitForKind } from "./sensorKinds";
import type { DeviceSensor } from "./devices";
import { upsertDeviceSensor } from "./devices";

export type DiscoveredPushSensor = {
  key: string;
  label: string;
  kind: SensorKind;
  unit?: string | null;
  visible?: boolean;
  /** Classic temp object probes also get a humidity sibling row. */
  withHumiditySibling?: boolean;
};

/** Create push-device sensor rows for newly seen ingest keys; never rename existing sensors. */
export async function ensureDiscoveredPushSensors(
  deviceId: string,
  discovered: DiscoveredPushSensor[],
  existing: DeviceSensor[] = [],
): Promise<{ created: number; error: string | null }> {
  const existingKeys = new Set(existing.map((sensor) => `${sensor.key}::${sensor.kind}`));
  let created = 0;

  for (const item of discovered) {
    if (item.withHumiditySibling) {
      if (!existingKeys.has(`${item.key}::temperature`)) {
        const temp = await upsertDeviceSensor(
          deviceId,
          item.key,
          item.label,
          "temperature",
          "F",
        );
        if (temp.error) return { created, error: temp.error };
        if (temp.sensor) {
          existingKeys.add(`${item.key}::temperature`);
          created += 1;
        }
      }
      if (!existingKeys.has(`${item.key}::humidity`)) {
        const humidity = await upsertDeviceSensor(
          deviceId,
          item.key,
          `${item.label} humidity`,
          "humidity",
          "%",
        );
        if (humidity.error) return { created, error: humidity.error };
        if (humidity.sensor) {
          existingKeys.add(`${item.key}::humidity`);
          created += 1;
        }
      }
      continue;
    }

    if (existingKeys.has(`${item.key}::${item.kind}`)) continue;

    const sensor = await upsertDeviceSensor(
      deviceId,
      item.key,
      item.label,
      item.kind,
      item.unit ?? defaultUnitForKind(item.kind),
    );
    if (sensor.error) return { created, error: sensor.error };
    if (sensor.sensor) {
      existingKeys.add(`${item.key}::${item.kind}`);
      created += 1;
    }
  }

  return { created, error: null };
}

export function labelForPushSensorKey(
  discovered: DiscoveredPushSensor[],
  key: string,
  kind: SensorKind,
): string | null {
  if (kind === "humidity") {
    const temp = discovered.find(
      (item) => item.key === key && item.withHumiditySibling,
    );
    return temp ? `${temp.label} humidity` : null;
  }
  const match = discovered.find((item) => item.key === key && item.kind === kind);
  return match?.label ?? null;
}
