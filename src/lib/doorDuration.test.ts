import { describe, expect, it } from "vitest";
import { computeDoorOpenSessions, formatDurationMs } from "./doorDuration";

describe("door duration", () => {
  it("computes closed session length", () => {
    const sessions = computeDoorOpenSessions([
      { label: "Door", kind: "door", value: true, recordedAt: "2026-01-01T10:00:00Z" },
      { label: "Door", kind: "door", value: false, recordedAt: "2026-01-01T10:30:00Z" },
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.durationMs).toBe(30 * 60 * 1000);
    expect(formatDurationMs(sessions[0]!.durationMs!)).toBe("30 min");
  });
});
