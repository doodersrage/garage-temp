import { describe, expect, it } from "vitest";
import {
  applySensorOffset,
  clampSensorOffset,
} from "./sensorCalibration";
import {
  buildColdestDayOverlay,
  findColdestUtcDay,
  shiftDayPointsToTargetDay,
  shiftSeriesOntoCurrentWindow,
} from "./historyOverlay";

describe("sensorCalibration", () => {
  it("clamps temperature offsets", () => {
    expect(clampSensorOffset(20, "temperature")).toBe(10);
    expect(clampSensorOffset(-20, "temperature")).toBe(-10);
  });

  it("applies offset", () => {
    expect(applySensorOffset(32, 1.5)).toBe(33.5);
    expect(applySensorOffset(50, null)).toBe(50);
  });
});

describe("historyOverlay", () => {
  it("finds the coldest UTC day", () => {
    const day = findColdestUtcDay([
      { timestamp: "2025-01-10T12:00:00Z", tempf: 40, humidity: 50, probeLabel: "A" },
      { timestamp: "2025-01-11T06:00:00Z", tempf: 20, humidity: 50, probeLabel: "A" },
      { timestamp: "2025-01-11T18:00:00Z", tempf: 25, humidity: 50, probeLabel: "A" },
      { timestamp: "2025-01-12T12:00:00Z", tempf: 35, humidity: 50, probeLabel: "A" },
    ]);
    expect(day).toBe("2025-01-11");
  });

  it("shifts a cold day onto the current window end", () => {
    const overlay = buildColdestDayOverlay(
      [
        { timestamp: "2025-01-11T06:00:00Z", tempf: 20, humidity: 50, probeLabel: "Garage" },
        { timestamp: "2025-01-11T18:00:00Z", tempf: 22, humidity: 50, probeLabel: "Garage" },
      ],
      [
        { timestamp: "2026-01-20T00:00:00Z", tempf: 40, humidity: 50, probeLabel: "Garage" },
        { timestamp: "2026-01-20T12:00:00Z", tempf: 42, humidity: 50, probeLabel: "Garage" },
      ],
    );
    expect(overlay.coldestDay).toBe("2025-01-11");
    expect(overlay.overlay[0]?.timestamp.startsWith("2026-01-20")).toBe(true);
    expect(overlay.minTempF).toBe(20);
  });

  it("time-aligns a prior-year series onto the current window", () => {
    const shifted = shiftSeriesOntoCurrentWindow(
      [
        { timestamp: "2025-08-01T00:00:00Z", tempf: 70, humidity: 40, probeLabel: "A" },
        { timestamp: "2025-08-02T00:00:00Z", tempf: 72, humidity: 40, probeLabel: "A" },
      ],
      [
        { timestamp: "2026-08-01T00:00:00Z", tempf: 68, humidity: 40, probeLabel: "A" },
        { timestamp: "2026-08-02T00:00:00Z", tempf: 69, humidity: 40, probeLabel: "A" },
      ],
    );
    expect(shifted[0]?.timestamp).toBe("2026-08-01T00:00:00.000Z");
  });

  it("shifts day points to a target day", () => {
    const points = shiftDayPointsToTargetDay(
      [{ timestamp: "2025-01-11T15:30:00Z", tempf: 18, humidity: 40, probeLabel: "A" }],
      "2026-02-01",
    );
    expect(points[0]?.timestamp).toBe("2026-02-01T15:30:00.000Z");
  });
});
