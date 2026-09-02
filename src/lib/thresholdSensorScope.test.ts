import { describe, expect, it } from "vitest";
import { evaluateAlerts, DEFAULT_ALERT_SETTINGS } from "./alerts";
import {
  freezeThresholdForReading,
  readingIncludedInThresholdAlerts,
} from "./thresholdSensorScope";

describe("thresholdSensorScope", () => {
  it("includes all sensors when scope list is empty", () => {
    expect(
      readingIncludedInThresholdAlerts(
        { includedSensorIds: [], overrides: {} },
        { sensorId: "abc" },
      ),
    ).toBe(true);
  });

  it("limits alerts to selected sensor ids", () => {
    const scope = { includedSensorIds: ["garage"], overrides: {} };
    expect(readingIncludedInThresholdAlerts(scope, { sensorId: "garage" })).toBe(true);
    expect(readingIncludedInThresholdAlerts(scope, { sensorId: "attic" })).toBe(false);
  });

  it("applies per-sensor freeze override", () => {
    expect(
      freezeThresholdForReading(
        {
          freezeThresholdF: 34,
          thresholdSensorScope: {
            includedSensorIds: [],
            overrides: { probe1: { freezeThresholdF: 30 } },
          },
        },
        { sensorId: "probe1" },
      ),
    ).toBe(30);
  });
});

describe("evaluateAlerts with sensor scope", () => {
  it("skips readings outside included sensor ids", () => {
    const messages = evaluateAlerts(
      {
        ...DEFAULT_ALERT_SETTINGS,
        enabled: true,
        thresholdSensorScope: {
          includedSensorIds: ["keep"],
          overrides: {},
        },
      },
      [
        { label: "Garage", tempf: 30, humidity: 40, sensorId: "keep" },
        { label: "Attic", tempf: 30, humidity: 40, sensorId: "skip" },
      ],
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("Garage");
  });
});
