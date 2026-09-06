import { fetchLatestSensorValues } from "./sensorReadings";

export const PROMETHEUS_SENSOR_METRIC = "thermaltrace_sensor_value";

function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

export async function buildPrometheusText(householdId: string): Promise<string> {
  const readings = await fetchLatestSensorValues(householdId);
  const lines: string[] = [
    `# HELP ${PROMETHEUS_SENSOR_METRIC} Latest numeric ThermalTrace sensor reading`,
    `# TYPE ${PROMETHEUS_SENSOR_METRIC} gauge`,
  ];
  for (const row of readings) {
    if (row.value_num == null) continue;
    const labels = [
      `device="${escapeLabelValue(row.deviceName)}"`,
      `key="${escapeLabelValue(row.sensor.key)}"`,
      `kind="${escapeLabelValue(row.sensor.kind)}"`,
    ].join(",");
    const ts = Date.parse(row.recorded_at);
    lines.push(
      `${PROMETHEUS_SENSOR_METRIC}{${labels}} ${row.value_num}${Number.isFinite(ts) ? ` ${ts}` : ""}`,
    );
  }
  return lines.join("\n") + "\n";
}
