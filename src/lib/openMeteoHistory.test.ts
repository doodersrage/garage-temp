import { describe, expect, it } from "vitest";
import {
  averageOpenMeteoTempF,
  openMeteoPointsToChartPoints,
  parseOpenMeteoHourly,
  priorYearWindow,
  splitOpenMeteoPastAndForecast,
} from "./openMeteoHistory";

describe("openMeteoHistory", () => {
  it("parses hourly archive payload", () => {
    const points = parseOpenMeteoHourly({
      hourly: {
        time: ["2024-01-01T12:00", "2024-01-01T13:00"],
        temperature_2m: [32, 34],
      },
    });
    expect(points).toHaveLength(2);
    expect(points[0]?.tempf).toBe(32);
  });

  it("averages hourly outdoor temps", () => {
    expect(
      averageOpenMeteoTempF([
        { timestamp: "a", tempf: 40 },
        { timestamp: "b", tempf: 44 },
      ]),
    ).toBe(42);
  });

  it("maps to chart points with outdoor label", () => {
    const chart = openMeteoPointsToChartPoints([{ timestamp: "2024-01-01T12:00", tempf: 50 }]);
    expect(chart[0]?.probeLabel).toBe("Outdoor (estimated)");
    expect(chart[0]?.timestamp).toContain("2024-01-01");
  });

  it("builds prior-year window ending one year ago", () => {
    const { start, end } = priorYearWindow(7);
    const roughlyOneYearMs = 365 * 24 * 60 * 60 * 1000;
    expect(end.getTime()).toBeLessThan(Date.now());
    expect(end.getTime() - start.getTime()).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
    expect(Date.now() - end.getTime()).toBeGreaterThan(roughlyOneYearMs - 8 * 24 * 60 * 60 * 1000);
  });

  it("splits past vs forecast at now", () => {
    const { past, forecast } = splitOpenMeteoPastAndForecast(
      [
        { timestamp: "2026-01-15T00:00:00Z", tempf: 30 },
        { timestamp: "2026-01-15T02:00:00Z", tempf: 28 },
      ],
      Date.parse("2026-01-15T01:00:00.000Z"),
    );
    expect(past).toHaveLength(1);
    expect(forecast).toHaveLength(1);
    expect(forecast[0]?.tempf).toBe(28);
  });
});
