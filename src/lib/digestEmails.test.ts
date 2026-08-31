import { describe, expect, it } from "vitest";
import { summarizePointsByDay } from "./digestEmails";
import type { ChartPoint } from "./garageTempsHistory";

describe("summarizePointsByDay", () => {
  it("returns one line per UTC day with min–max and average", () => {
    const points: ChartPoint[] = [
      {
        timestamp: "2026-01-05T08:00:00Z",
        tempf: 40,
        humidity: 50,
        probeLabel: "Garage",
      },
      {
        timestamp: "2026-01-05T20:00:00Z",
        tempf: 50,
        humidity: 45,
        probeLabel: "Garage",
      },
      {
        timestamp: "2026-01-06T12:00:00Z",
        tempf: 32,
        humidity: 60,
        probeLabel: "Garage",
      },
    ];

    const lines = summarizePointsByDay(points);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^Mon, Jan 5: 40\.0–50\.0 °F \(avg 45\.0°\)$/);
    expect(lines[1]).toMatch(/^Tue, Jan 6: 32\.0–32\.0 °F \(avg 32\.0°\)$/);
  });

  it("notes the coldest probe when multiple probes share a day", () => {
    const points: ChartPoint[] = [
      {
        timestamp: "2026-01-05T08:00:00Z",
        tempf: 42,
        humidity: 50,
        probeLabel: "Garage",
      },
      {
        timestamp: "2026-01-05T09:00:00Z",
        tempf: 34,
        humidity: 55,
        probeLabel: "Pipe bay",
      },
    ];

    const lines = summarizePointsByDay(points);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("34.0–42.0 °F");
    expect(lines[0]).toContain("coldest Pipe bay");
  });

  it("returns empty for no points", () => {
    expect(summarizePointsByDay([])).toEqual([]);
  });
});
