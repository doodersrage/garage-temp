import { describe, expect, it, vi } from "vitest";
import {
  buildWeatherSimulatedFeed,
  deriveDoorOpen,
  deriveSunIntensity,
  fetchWeatherSimulatedFeed,
} from "./weatherSimulatedFeed";

vi.mock("./FetchWeather", () => ({
  fetchWeatherSnapshot: vi.fn(),
  resolveWeatherCityId: vi.fn((id?: string | null) => id ?? "5128581"),
}));

import { fetchWeatherSnapshot } from "./FetchWeather";

describe("weatherSimulatedFeed", () => {
  it("derives sun intensity from cloud cover and time of day", () => {
    const noon = new Date("2026-01-15T17:00:00.000Z"); // ~noon US Eastern in winter UTC
    expect(deriveSunIntensity({ cloudCover: 0 }, noon)).toBeGreaterThan(50);
    expect(deriveSunIntensity({ cloudCover: 100 }, noon)).toBe(0);
  });

  it("builds pull and ingest payloads with three probes plus avg", () => {
    const { pull, ingest } = buildWeatherSimulatedFeed({
      weather: { temp: 30, description: "clear", cloudCover: 10 },
      controls: { outdoorF: 30, sunIntensity: 40, doorOpen: false },
      noisy: false,
    });

    expect(Object.keys(pull.temp).sort()).toEqual(["0", "1", "2", "avg"]);
    expect(pull.temp.avg!.f).toBeGreaterThan(30);
    expect(pull.battery_pct).toBeGreaterThan(0);
    expect(ingest.sensors.some((s) => s.key === "shop_door" && s.bool === false)).toBe(true);
  });

  it("uses weather snapshot when available", async () => {
    vi.mocked(fetchWeatherSnapshot).mockResolvedValue({
      name: "New York",
      country: "US",
      lat: 40.7,
      lon: -74,
      temp: 28,
      humidity: 55,
      feelsLike: 22,
      windSpeed: 8,
      windGust: null,
      cloudCover: 20,
      description: "clear sky",
    });

    const result = await fetchWeatherSimulatedFeed({ noisy: false });
    expect(result.meta.weather_source).toBe("openweather");
    expect(result.meta.outdoor_temp_f).toBe(28);
    expect(result.pull.temp["0"]!.f).toBeGreaterThan(28);
  });

  it("falls back when weather is unavailable", async () => {
    vi.mocked(fetchWeatherSnapshot).mockResolvedValue(null);
    const result = await fetchWeatherSimulatedFeed({ noisy: false });
    expect(result.meta.weather_source).toBe("fallback");
    expect(result.pull.temp.avg).toBeDefined();
  });

  it("honors door override", () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    expect(deriveDoorOpen(now, true)).toBe(true);
    expect(deriveDoorOpen(now, false)).toBe(false);
  });
});
