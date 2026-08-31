import { describe, expect, it } from "vitest";
import { compareSpaceAverages } from "./seasonalInsights";

describe("space averages", () => {
  it("compares two spaces", () => {
    const map = new Map([
      ["Probe A", "garage"],
      ["Probe B", "attic"],
    ]);
    const lines = compareSpaceAverages(
      [
        { timestamp: "t", tempf: 40, humidity: 50, probeLabel: "Probe A" },
        { timestamp: "t", tempf: 55, humidity: 50, probeLabel: "Probe B" },
      ],
      map,
    );
    expect(lines[0]).toContain("attic");
  });
});
