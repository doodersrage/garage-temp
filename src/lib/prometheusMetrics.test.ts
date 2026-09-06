import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLatestSensorValues } from "./sensorReadings";
import { PROMETHEUS_SENSOR_METRIC, buildPrometheusText } from "./prometheusMetrics";

vi.mock("./sensorReadings", () => ({
  fetchLatestSensorValues: vi.fn(),
}));

const fetchLatest = vi.mocked(fetchLatestSensorValues);

describe("buildPrometheusText", () => {
  beforeEach(() => {
    fetchLatest.mockReset();
  });

  it("emits a stable ThermalTrace gauge with device/key/kind labels", async () => {
    fetchLatest.mockResolvedValue([
      {
        deviceName: 'Bay "A"',
        value_num: 42.5,
        value_bool: null,
        value_text: null,
        recorded_at: "2026-01-15T12:00:00.000Z",
        sensor: {
          id: "s1",
          key: "temp1",
          kind: "temperature",
        } as never,
      },
      {
        deviceName: "Bay A",
        value_num: null,
        value_bool: true,
        value_text: null,
        recorded_at: "2026-01-15T12:00:00.000Z",
        sensor: {
          id: "s2",
          key: "leak",
          kind: "flood",
        } as never,
      },
    ]);

    const body = await buildPrometheusText("hh-1");
    expect(body).toContain(`# HELP ${PROMETHEUS_SENSOR_METRIC} Latest numeric ThermalTrace sensor reading`);
    expect(body).toContain(`# TYPE ${PROMETHEUS_SENSOR_METRIC} gauge`);
    const ts = Date.parse("2026-01-15T12:00:00.000Z");
    expect(body).toContain(
      `${PROMETHEUS_SENSOR_METRIC}{device="Bay \\"A\\"",key="temp1",kind="temperature"} 42.5 ${ts}`,
    );
    expect(body).not.toContain('kind="flood"');
    expect(body).not.toContain("garage_temp_fahrenheit");
  });
});
