import { describe, expect, it } from "vitest";
import { batterySparklinePath } from "./batterySparkline";

describe("battery sparkline", () => {
  it("builds svg path from history", () => {
    const path = batterySparklinePath([
      { pct: 90, at: "2026-01-01T10:00:00Z" },
      { pct: 70, at: "2026-01-01T12:00:00Z" },
    ]);
    expect(path.startsWith("M")).toBe(true);
  });
});
