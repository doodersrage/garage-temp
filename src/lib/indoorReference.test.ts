import { describe, expect, it } from "vitest";
import { listIndoorReferenceOptions, findReferenceSensorLabel } from "./indoorReference";
import type { DeviceWithSensors } from "./devices";

const devices: DeviceWithSensors[] = [
  {
    id: "dev-1",
    household_id: "hh-1",
    name: "Garage ESP",
    source: "push",
    enabled: true,
    sort_order: 0,
    pull_url: null,
    ingest_key_prefix: null,
    last_seen_at: null,
    space: "garage",
    sensors: [
      {
        id: "s-garage",
        device_id: "dev-1",
        key: "temp1",
        label: "Garage",
        kind: "temperature",
        unit: "F",
        visible: true,
        sort_order: 0,
        offset_num: 0,
      },
    ],
  },
  {
    id: "dev-2",
    household_id: "hh-1",
    name: "Hallway HA",
    source: "push",
    enabled: true,
    sort_order: 1,
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
      {
        id: "s-door",
        device_id: "dev-2",
        key: "door1",
        label: "Front door",
        kind: "door",
        unit: null,
        visible: true,
        sort_order: 1,
        offset_num: 0,
      },
    ],
  },
];

describe("indoorReference", () => {
  it("lists visible temperature sensors only", () => {
    const options = listIndoorReferenceOptions(devices);
    expect(options).toHaveLength(2);
    expect(options.map((o) => o.sensorId)).toEqual(["s-garage", "s-hall"]);
  });

  it("finds reference sensor label", () => {
    expect(findReferenceSensorLabel(devices, "s-hall")).toBe("Hallway");
    expect(findReferenceSensorLabel(devices, null)).toBeNull();
  });
});
