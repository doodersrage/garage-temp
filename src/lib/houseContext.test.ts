import { describe, expect, it } from "vitest";
import { buildHouseContext, resolveReferenceSensorTempF } from "./houseContext";
import type { DeviceWithSensors } from "./devices";
import type { LatestSensorRow } from "./sensorReadings";

const devices: DeviceWithSensors[] = [
  {
    id: "dev-2",
    household_id: "hh-1",
    name: "Hallway HA",
    source: "push",
    enabled: true,
    sort_order: 0,
    pull_url: null,
    ingest_key_prefix: null,
    last_seen_at: null,
    space: "house",
    sensors: [
      {
        id: "s-hall",
        device_id: "dev-2",
        key: "indoor",
        label: "Hallway",
        kind: "temperature",
        unit: "F",
        visible: true,
        sort_order: 0,
        offset_num: 0,
      },
    ],
  },
];

const latest: LatestSensorRow[] = [
  {
    sensor: devices[0]!.sensors[0]!,
    deviceName: "Hallway HA",
    value_num: 72,
    value_bool: null,
    value_text: null,
    recorded_at: "2026-01-01T12:00:00Z",
  },
];

describe("houseContext", () => {
  it("prefers thermostat over reference sensor", () => {
    const context = buildHouseContext({
      thermostatSnapshot: {
        provider: "nest",
        ambientTempF: 79,
        heatSetpointF: 80,
        hvacMode: "COOL",
      },
      referenceSensorId: "s-hall",
      latest,
      devices,
    });
    expect(context?.source).toBe("thermostat");
    expect(context?.ambientTempF).toBe(79);
  });

  it("uses reference sensor when no thermostat", () => {
    const context = buildHouseContext({
      thermostatSnapshot: null,
      referenceSensorId: "s-hall",
      latest,
      devices,
    });
    expect(context?.source).toBe("reference_sensor");
    expect(context?.metricValue).toBe("72°F");
    expect(context?.metricDetail).toContain("Hallway");
  });

  it("resolves reference sensor temp from latest readings", () => {
    expect(resolveReferenceSensorTempF("s-hall", latest)).toBe(72);
    expect(resolveReferenceSensorTempF("missing", latest)).toBeNull();
  });
});
