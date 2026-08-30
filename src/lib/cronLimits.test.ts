import { afterEach, describe, expect, it } from "vitest";
import {
  checkCronRateLimit,
  CRON_RATE_LIMIT_MAX,
  resetCronRateLimitStateForTests,
} from "./cronLimits";

afterEach(() => {
  resetCronRateLimitStateForTests();
});

describe("cron rate limit", () => {
  it("allows a burst then blocks", () => {
    const now = Date.parse("2026-08-30T12:00:00.000Z");
    for (let i = 0; i < CRON_RATE_LIMIT_MAX; i += 1) {
      expect(checkCronRateLimit("1.1.1.1", now).ok).toBe(true);
    }
    expect(checkCronRateLimit("1.1.1.1", now).ok).toBe(false);
  });
});
