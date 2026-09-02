import { describe, expect, it } from "vitest";
import {
  buildAirQualityOverview,
  buildDoorTempSummary,
  buildMotionSummary,
  buildPowerTempSummary,
  computeCondensationHours,
  computeFeedUptimePct,
  computeIndoorOutdoorDelta,
  computeProbeSpreadF,
  doorOpenMinutesFromSessions,
} from "./overviewExtras";
import type { DoorOpenSession } from "./doorDuration";
import type { ChartPoint } from "./garageTempsHistory";
import type { LatestSensorRow } from "./sensorReadings";

describe("overviewExtras", () => {
  it("sums door open minutes including still-open sessions", () => {
    const openedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const sessions: DoorOpenSession[] = [
      {
        label: "Garage",
        openedAt: "2026-01-01T10:00:00.000Z",
        closedAt: "2026-01-01T10:15:00.000Z",
        durationMs: 15 * 60 * 1000,
        stillOpen: false,
      },
      {
        label: "Garage",
        openedAt,
        closedAt: null,
        durationMs: null,
        stillOpen: true,
      },
    ];
    const minutes = doorOpenMinutesFromSessions(sessions);
    expect(minutes).toBeGreaterThan(40);
    expect(minutes).toBeLessThan(50);
  });

  it("builds door vs temp summary when open and cooling", () => {
    const now = Date.now();
    const points: ChartPoint[] = Array.from({ length: 6 }, (_, i) => ({
      timestamp: new Date(now - (5 - i) * 60 * 60 * 1000).toISOString(),
      tempf: 45 - i * 2,
      humidity: 40,
      probeLabel: "Probe",
    }));
    const sessions: DoorOpenSession[] = [
      {
        label: "Bay door",
        openedAt: new Date(now - 20 * 60 * 1000).toISOString(),
        closedAt: null,
        durationMs: null,
        stillOpen: true,
      },
    ];
    const summary = buildDoorTempSummary(sessions, points, 10);
    expect(summary?.title).toBe("Door open now");
    expect(summary?.tone).toBe("warning");
  });

  it("computes indoor-outdoor delta and probe spread", () => {
    expect(computeIndoorOutdoorDelta(40, 20)).toBe(20);
    expect(computeIndoorOutdoorDelta(null, 20)).toBeNull();
    const spread = computeProbeSpreadF([
      {
        sensor: { id: "1", kind: "temperature", label: "A" } as LatestSensorRow["sensor"],
        deviceName: "d",
        value_num: 36,
        value_bool: null,
        value_text: null,
        recorded_at: "t",
      },
      {
        sensor: { id: "2", kind: "temperature", label: "B" } as LatestSensorRow["sensor"],
        deviceName: "d",
        value_num: 44,
        value_bool: null,
        value_text: null,
        recorded_at: "t",
      },
    ]);
    expect(spread?.spreadF).toBe(8);
  });

  it("estimates condensation hours near dew point", () => {
    const now = Date.now();
    const points: ChartPoint[] = Array.from({ length: 4 }, (_, i) => ({
      timestamp: new Date(now - (3 - i) * 60 * 60 * 1000).toISOString(),
      tempf: 50,
      humidity: 95,
      probeLabel: "Probe",
    }));
    const result = computeCondensationHours(points, 5);
    expect(result.hours).toBeGreaterThan(0);
    expect(result.latestMarginF).not.toBeNull();
  });

  it("computes feed uptime percent", () => {
    const uptime = computeFeedUptimePct([
      {
        feedId: "a",
        feedName: "A",
        url: "https://a",
        ok: true,
        message: "ok",
        probeCount: 1,
        checkedAt: "t",
      },
      {
        feedId: "b",
        feedName: "B",
        url: "https://b",
        ok: false,
        message: "fail",
        probeCount: 0,
        checkedAt: "t",
      },
    ]);
    expect(uptime?.pct).toBe(50);
  });

  it("flags air quality watches and power-off cooling", () => {
    const air = buildAirQualityOverview([
      {
        sensor: { id: "c", kind: "co2", label: "Bay CO2" } as LatestSensorRow["sensor"],
        deviceName: "d",
        value_num: 1400,
        value_bool: null,
        value_text: null,
        recorded_at: "t",
      },
    ]);
    expect(air.watchCount).toBe(1);

    const now = Date.now();
    const points: ChartPoint[] = Array.from({ length: 6 }, (_, i) => ({
      timestamp: new Date(now - (5 - i) * 60 * 60 * 1000).toISOString(),
      tempf: 50 - i * 3,
      humidity: 40,
      probeLabel: "Probe",
    }));
    const power = buildPowerTempSummary(
      [
        {
          label: "Heater",
          openedAt: new Date(now - 40 * 60 * 1000).toISOString(),
          closedAt: null,
          durationMs: null,
          stillOpen: true,
        },
      ],
      points,
      10,
    );
    expect(power?.title).toBe("Power off now");

    const motion = buildMotionSummary([]);
    expect(motion).toBeNull();
  });
});
