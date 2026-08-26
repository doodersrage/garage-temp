import { fetchLatestSensorValues } from "./sensorReadings";

export function prometheusMetricName(
  device: string,
  key: string,
  kind: string,
): string {
  const base = `garage_${kind}_${device}_${key}`
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "garage_sensor";
}

export async function buildPrometheusText(householdId: string): Promise<string> {
  const readings = await fetchLatestSensorValues(householdId);
  const lines: string[] = [
    "# HELP garage_sensor_value Latest numeric garage sensor reading",
    "# TYPE garage_sensor_value gauge",
  ];
  for (const row of readings) {
    if (row.value_num == null) continue;
    const name = prometheusMetricName(
      row.deviceName,
      row.sensor.key,
      row.sensor.kind,
    );
    const labels = `device="${row.deviceName.replace(/"/g, "")}",key="${row.sensor.key}",kind="${row.sensor.kind}"`;
    const ts = Date.parse(row.recorded_at);
    lines.push(
      `${name}{${labels}} ${row.value_num}${Number.isFinite(ts) ? ` ${ts}` : ""}`,
    );
  }
  return lines.join("\n") + "\n";
}
