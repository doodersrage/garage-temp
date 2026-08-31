import { describe, expect, it } from "vitest";
import { buildDoorEventRows } from "./doorEvents";
import type { DoorOpenSession } from "./doorDuration";

describe("door event rows", () => {
  const sessions: DoorOpenSession[] = [
    {
      label: "Garage door",
      openedAt: "2026-01-01T12:00:00Z",
      closedAt: "2026-01-01T12:30:00Z",
      durationMs: 30 * 60 * 1000,
      stillOpen: false,
    },
    {
      label: "Garage door",
      openedAt: "2026-01-01T14:00:00Z",
      closedAt: null,
      durationMs: null,
      stillOpen: true,
    },
  ];

  it("skips open sessions and duplicates", () => {
    const existing = new Set(["Garage door:2026-01-01T12:00:00Z"]);
    const sensorMap = new Map([["Garage door", "sensor-1"]]);
    const rows = buildDoorEventRows("hh-1", sessions, existing, sensorMap);
    expect(rows).toHaveLength(0);
  });

  it("maps sensor ids by label", () => {
    const rows = buildDoorEventRows(
      "hh-1",
      sessions,
      new Set(),
      new Map([["Garage door", "sensor-1"]]),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sensor_id).toBe("sensor-1");
    expect(rows[0]?.duration_ms).toBe(30 * 60 * 1000);
  });
});
