import { describe, expect, it } from "vitest";
import { inferSensorKind } from "./ingestPayload";
import {
  isSensorKind,
  SENSOR_KINDS,
  SENSOR_KIND_LABELS,
  formatBoolSensorValue,
} from "./sensorKinds";

describe("sensorKinds", () => {
  it("labels every first-class kind", () => {
    for (const kind of SENSOR_KINDS) {
      expect(SENSOR_KIND_LABELS[kind].length).toBeGreaterThan(2);
      expect(isSensorKind(kind)).toBe(true);
    }
    expect(isSensorKind("smoke")).toBe(false);
  });

  it("formats boolean states", () => {
    expect(formatBoolSensorValue("motion", true)).toBe("Detected");
    expect(formatBoolSensorValue("flood", false)).toBe("Dry");
  });

  it("infers workshop kinds from keys", () => {
    expect(inferSensorKind("pm25", { key: "pm25", value: 12 })).toBe("pm25");
    expect(inferSensorKind("tvoc", { key: "tvoc", value: 220 })).toBe("voc");
    expect(inferSensorKind("baro", { key: "baro", value: 1012 })).toBe("pressure");
    expect(inferSensorKind("sump_level", { key: "sump_level", value: 40 })).toBe("level");
    expect(inferSensorKind("heater_w", { key: "heater_w", value: 850 })).toBe("energy");
    expect(inferSensorKind("pir1", { key: "pir1", bool: true })).toBe("motion");
  });
});
