import { describe, expect, it } from "vitest";
import {
  buildAlertReadingsFromLatestSensors,
  mergeAlertReadings,
} from "./alertReadings";
import type { DeviceSensor } from "./devices";

function sensor(
  partial: Partial<DeviceSensor> & Pick<DeviceSensor, "id" | "device_id" | "key" | "kind">,
): DeviceSensor {
  return {
    label: partial.label ?? partial.key,
    unit: partial.unit ?? null,
    visible: partial.visible ?? true,
    sort_order: partial.sort_order ?? 0,
    ...partial,
  };
}

describe("buildAlertReadingsFromLatestSensors", () => {
  it("pairs temperature and humidity by device key", () => {
    const readings = buildAlertReadingsFromLatestSensors([
      {
        sensor: sensor({
          id: "t1",
          device_id: "d1",
          key: "0",
          kind: "temperature",
          label: "Probe 0",
        }),
        deviceName: "Garage ESP",
        value_num: 31,
      },
      {
        sensor: sensor({
          id: "h1",
          device_id: "d1",
          key: "0",
          kind: "humidity",
          label: "Probe 0 humidity",
        }),
        deviceName: "Garage ESP",
        value_num: 80,
      },
      {
        sensor: sensor({
          id: "door",
          device_id: "d1",
          key: "door1",
          kind: "door",
          label: "Door",
        }),
        deviceName: "Garage ESP",
        value_num: null,
      },
    ]);

    expect(readings).toEqual([{ label: "Probe 0", tempf: 31, humidity: 80, space: null }]);
  });

  it("includes temperature-only probes with humidity 0", () => {
    const readings = buildAlertReadingsFromLatestSensors([
      {
        sensor: sensor({
          id: "t2",
          device_id: "d2",
          key: "temp1",
          kind: "temperature",
          label: "Bay",
        }),
        deviceName: "Push",
        value_num: 40,
      },
    ]);

    expect(readings).toEqual([{ label: "Bay", tempf: 40, humidity: 0, space: null }]);
  });
});

describe("mergeAlertReadings", () => {
  it("prefers live feed readings over stored sensor readings", () => {
    const merged = mergeAlertReadings(
      [{ label: "Probe 0", tempf: 33, humidity: 40 }],
      [
        { label: "Probe 0", tempf: 31, humidity: 80 },
        { label: "Probe 1", tempf: 42, humidity: 50 },
      ],
    );

    expect(merged).toEqual(
      expect.arrayContaining([
        { label: "Probe 0", tempf: 33, humidity: 40 },
        { label: "Probe 1", tempf: 42, humidity: 50 },
      ]),
    );
    expect(merged).toHaveLength(2);
  });
});
