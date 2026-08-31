import { afterEach, describe, expect, it } from "vitest";
import {
  checkWeatherSearchRateLimit,
  resetWeatherSearchRateLimitStateForTests,
  WEATHER_SEARCH_RATE_LIMIT_MAX,
} from "./weatherSearchLimits";

afterEach(() => {
  resetWeatherSearchRateLimitStateForTests();
});

describe("weather search rate limit", () => {
  it("allows a burst then blocks", () => {
    const now = Date.parse("2026-08-31T12:00:00.000Z");
    for (let i = 0; i < WEATHER_SEARCH_RATE_LIMIT_MAX; i += 1) {
      expect(checkWeatherSearchRateLimit("1.1.1.1", now).ok).toBe(true);
    }
    const blocked = checkWeatherSearchRateLimit("1.1.1.1", now);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates keys", () => {
    const now = Date.parse("2026-08-31T12:00:00.000Z");
    for (let i = 0; i < WEATHER_SEARCH_RATE_LIMIT_MAX; i += 1) {
      expect(checkWeatherSearchRateLimit("a", now).ok).toBe(true);
    }
    expect(checkWeatherSearchRateLimit("b", now).ok).toBe(true);
  });

  it("resets after the window passes", () => {
    const now = Date.parse("2026-08-31T12:00:00.000Z");
    for (let i = 0; i < WEATHER_SEARCH_RATE_LIMIT_MAX; i += 1) {
      checkWeatherSearchRateLimit("1.2.3.4", now);
    }
    expect(checkWeatherSearchRateLimit("1.2.3.4", now).ok).toBe(false);
    expect(checkWeatherSearchRateLimit("1.2.3.4", now + 61_000).ok).toBe(true);
  });
});
