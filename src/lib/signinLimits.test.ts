import { afterEach, describe, expect, it } from "vitest";
import {
  checkSigninRateLimit,
  clearSigninFailures,
  recordSigninFailure,
  resetSigninRateLimitStateForTests,
  SIGNIN_RATE_LIMIT_MAX_FAILURES,
} from "./signinLimits";

afterEach(() => {
  resetSigninRateLimitStateForTests();
});

describe("signin rate limit", () => {
  it("allows attempts until the failure cap, then blocks", () => {
    const now = Date.parse("2026-08-30T12:00:00.000Z");
    for (let i = 0; i < SIGNIN_RATE_LIMIT_MAX_FAILURES; i += 1) {
      expect(checkSigninRateLimit("user@example.com", now).ok).toBe(true);
      recordSigninFailure("user@example.com", now);
    }
    const blocked = checkSigninRateLimit("user@example.com", now);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("is keyed by normalized email, isolating accounts", () => {
    const now = Date.parse("2026-08-30T12:00:00.000Z");
    for (let i = 0; i < SIGNIN_RATE_LIMIT_MAX_FAILURES; i += 1) {
      recordSigninFailure("Attacker@Example.com", now);
    }
    expect(checkSigninRateLimit("attacker@example.com", now).ok).toBe(false);
    expect(checkSigninRateLimit("someone-else@example.com", now).ok).toBe(true);
  });

  it("clears on successful sign-in", () => {
    const now = Date.parse("2026-08-30T12:00:00.000Z");
    for (let i = 0; i < SIGNIN_RATE_LIMIT_MAX_FAILURES; i += 1) {
      recordSigninFailure("user@example.com", now);
    }
    expect(checkSigninRateLimit("user@example.com", now).ok).toBe(false);
    clearSigninFailures("user@example.com");
    expect(checkSigninRateLimit("user@example.com", now).ok).toBe(true);
  });

  it("resets the window after it expires", () => {
    const now = Date.parse("2026-08-30T12:00:00.000Z");
    for (let i = 0; i < SIGNIN_RATE_LIMIT_MAX_FAILURES; i += 1) {
      recordSigninFailure("user@example.com", now);
    }
    expect(checkSigninRateLimit("user@example.com", now).ok).toBe(false);
    const later = now + 16 * 60 * 1000;
    expect(checkSigninRateLimit("user@example.com", later).ok).toBe(true);
  });
});
