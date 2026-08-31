import { describe, expect, it } from "vitest";
import { computeFreezeHours } from "./freezeHours";

describe("freeze hours", () => {
  it("estimates hours below threshold", () => {
    const summary = computeFreezeHours([
      { timestamp: "2026-01-01T00:00:00Z", tempf: 30, humidity: 50, probeLabel: "A" },
      { timestamp: "2026-01-01T02:00:00Z", tempf: 30, humidity: 50, probeLabel: "A" },
    ]);
    expect(summary.hoursBelow34).toBeGreaterThan(0);
    expect(summary.coldestF).toBe(30);
  });
});
