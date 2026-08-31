import { describe, expect, it } from "vitest";
import { compareWeekAverages } from "./weekCompare";

describe("week compare", () => {
  it("computes average delta", () => {
    const result = compareWeekAverages(
      [
        { timestamp: "a", tempf: 40, humidity: 50, probeLabel: "Garage" },
        { timestamp: "b", tempf: 42, humidity: 50, probeLabel: "Garage" },
      ],
      [{ timestamp: "c", tempf: 38, humidity: 50, probeLabel: "Garage" }],
    );
    expect(result.deltaF).toBe(3);
  });
});
