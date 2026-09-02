import { describe, expect, it } from "vitest";
import {
  buildDoorTempSummary,
  doorOpenMinutesFromSessions,
} from "./overviewExtras";
import type { DoorOpenSession } from "./doorDuration";
import type { ChartPoint } from "./garageTempsHistory";

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
});
