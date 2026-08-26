import type { TempFeedResult, TempProbeConfig } from "./tempFeedConfig";
import type { AlertReading } from "./alerts";
import type { DeviceSensor } from "./devices";

export function buildReadingsFromResults(
  results: TempFeedResult[],
  probes: TempProbeConfig[],
): AlertReading[] {
  return probes.flatMap((probe) => {
    const feed = results.find((result) => result.id === probe.feedId);
    const data = feed?.probes[probe.key];
    if (!feed || feed.error || !data) return [];
    return [{ label: probe.label, tempf: data.f, humidity: data.h }];
  });
}

/** Build freeze/humidity alert readings from latest DB sensor values (push + pull). */
export function buildAlertReadingsFromLatestSensors(
  latest: Array<{
    sensor: DeviceSensor;
    deviceName: string;
    value_num: number | null;
  }>,
): AlertReading[] {
  type Acc = { label: string; tempf?: number; humidity?: number };
  const byKey = new Map<string, Acc>();

  for (const row of latest) {
    if (row.value_num == null) continue;
    if (row.sensor.kind !== "temperature" && row.sensor.kind !== "humidity") {
      continue;
    }

    const mapKey = `${row.sensor.device_id}:${row.sensor.key}`;
    const entry = byKey.get(mapKey) ?? {
      label: row.sensor.label.replace(/\s+humidity$/i, "") || row.sensor.label,
    };

    if (row.sensor.kind === "temperature") {
      entry.tempf = row.value_num;
      entry.label = row.sensor.label.replace(/\s+humidity$/i, "") || row.sensor.label;
    } else {
      entry.humidity = row.value_num;
    }

    byKey.set(mapKey, entry);
  }

  return [...byKey.values()]
    .filter((entry) => typeof entry.tempf === "number")
    .map((entry) => ({
      label: entry.label,
      tempf: entry.tempf!,
      humidity: entry.humidity ?? 0,
    }));
}

/** Prefer live feed readings; fill gaps from stored sensor readings. */
export function mergeAlertReadings(
  preferred: AlertReading[],
  fallback: AlertReading[],
): AlertReading[] {
  const byLabel = new Map<string, AlertReading>();
  for (const reading of fallback) {
    byLabel.set(reading.label, reading);
  }
  for (const reading of preferred) {
    byLabel.set(reading.label, reading);
  }
  return [...byLabel.values()];
}
