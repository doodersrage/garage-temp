import { afterEach, describe, expect, it } from "vitest";
import {
  checkDemoTempsRateLimit,
  resetDemoTempsRateLimitStateForTests,
  DEMO_TEMPS_RATE_LIMIT_MAX,
} from "./demoTempsLimits";

afterEach(() => {
  resetDemoTempsRateLimitStateForTests();
});

describe("demo temps rate limit", () => {
  it("allows a burst then blocks", () => {
    const now = Date.parse("2026-08-31T12:00:00.000Z");
    for (let i = 0; i < DEMO_TEMPS_RATE_LIMIT_MAX; i += 1) {
      expect(checkDemoTempsRateLimit("1.1.1.1", now).ok).toBe(true);
    }
    const blocked = checkDemoTempsRateLimit("1.1.1.1", now);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates keys", () => {
    const now = Date.parse("2026-08-31T12:00:00.000Z");
    for (let i = 0; i < DEMO_TEMPS_RATE_LIMIT_MAX; i += 1) {
      expect(checkDemoTempsRateLimit("a", now).ok).toBe(true);
    }
    expect(checkDemoTempsRateLimit("b", now).ok).toBe(true);
  });

  it("resets after the window passes", () => {
    const now = Date.parse("2026-08-31T12:00:00.000Z");
    for (let i = 0; i < DEMO_TEMPS_RATE_LIMIT_MAX; i += 1) {
      checkDemoTempsRateLimit("1.2.3.4", now);
    }
    expect(checkDemoTempsRateLimit("1.2.3.4", now).ok).toBe(false);
    expect(checkDemoTempsRateLimit("1.2.3.4", now + 61_000).ok).toBe(true);
  });
});
