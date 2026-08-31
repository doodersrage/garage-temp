import { afterEach, describe, expect, it } from "vitest";
import {
  checkMfaVerifyRateLimit,
  clearMfaVerifyFailures,
  MFA_VERIFY_RATE_LIMIT_MAX_FAILURES,
  recordMfaVerifyFailure,
  resetMfaVerifyRateLimitStateForTests,
} from "./mfaVerifyLimits";

afterEach(() => {
  resetMfaVerifyRateLimitStateForTests();
});

describe("MFA verify rate limit", () => {
  it("allows attempts until the failure cap, then blocks", () => {
    const now = Date.parse("2026-08-30T12:00:00.000Z");
    for (let i = 0; i < MFA_VERIFY_RATE_LIMIT_MAX_FAILURES; i += 1) {
      expect(checkMfaVerifyRateLimit("user-1", now).ok).toBe(true);
      recordMfaVerifyFailure("user-1", now);
    }
    const blocked = checkMfaVerifyRateLimit("user-1", now);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates buckets per user id", () => {
    const now = Date.parse("2026-08-30T12:00:00.000Z");
    for (let i = 0; i < MFA_VERIFY_RATE_LIMIT_MAX_FAILURES; i += 1) {
      recordMfaVerifyFailure("user-1", now);
    }
    expect(checkMfaVerifyRateLimit("user-1", now).ok).toBe(false);
    expect(checkMfaVerifyRateLimit("user-2", now).ok).toBe(true);
  });

  it("resets after the window passes", () => {
    const now = Date.parse("2026-08-30T12:00:00.000Z");
    for (let i = 0; i < MFA_VERIFY_RATE_LIMIT_MAX_FAILURES; i += 1) {
      recordMfaVerifyFailure("user-1", now);
    }
    expect(checkMfaVerifyRateLimit("user-1", now).ok).toBe(false);
    const later = now + 15 * 60 * 1000 + 1;
    expect(checkMfaVerifyRateLimit("user-1", later).ok).toBe(true);
  });

  it("clears failures after a successful verification", () => {
    const now = Date.parse("2026-08-30T12:00:00.000Z");
    recordMfaVerifyFailure("user-1", now);
    recordMfaVerifyFailure("user-1", now);
    clearMfaVerifyFailures("user-1");
    expect(checkMfaVerifyRateLimit("user-1", now).ok).toBe(true);
  });
});
