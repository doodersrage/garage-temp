import { describe, expect, it } from "vitest";
import { estimateTimeToFreeze } from "./timeToFreeze";

describe("time to freeze", () => {
  it("estimates hours when cooling", () => {
    const result = estimateTimeToFreeze(40, 32, [
      { at: "2026-01-01T10:00:00Z", tempF: 42 },
      { at: "2026-01-01T12:00:00Z", tempF: 40 },
    ]);
    expect(result.hours).not.toBeNull();
    expect(result.rateFPerHour).toBeLessThan(0);
  });
});
