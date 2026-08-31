import { afterEach, describe, expect, it } from "vitest";
import {
  checkStatusSubscribeRateLimit,
  isStatusSubscribeHoneypotTriggered,
  resetStatusSubscribeRateLimitStateForTests,
  STATUS_SUBSCRIBE_RATE_LIMIT_MAX,
} from "./statusSubscribeLimits";

afterEach(() => {
  resetStatusSubscribeRateLimitStateForTests();
});

describe("status subscribe honeypot", () => {
  it("treats filled hidden fields as bots", () => {
    expect(isStatusSubscribeHoneypotTriggered(null)).toBe(false);
    expect(isStatusSubscribeHoneypotTriggered("")).toBe(false);
    expect(isStatusSubscribeHoneypotTriggered("   ")).toBe(false);
    expect(isStatusSubscribeHoneypotTriggered("Acme Inc")).toBe(true);
  });
});

describe("status subscribe rate limit", () => {
  it("allows a burst then blocks", () => {
    const now = Date.parse("2026-08-30T12:00:00.000Z");
    for (let i = 0; i < STATUS_SUBSCRIBE_RATE_LIMIT_MAX; i += 1) {
      expect(checkStatusSubscribeRateLimit("1.1.1.1", now).ok).toBe(true);
    }
    const blocked = checkStatusSubscribeRateLimit("1.1.1.1", now);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates keys", () => {
    const now = Date.parse("2026-08-30T12:00:00.000Z");
    for (let i = 0; i < STATUS_SUBSCRIBE_RATE_LIMIT_MAX; i += 1) {
      expect(checkStatusSubscribeRateLimit("a", now).ok).toBe(true);
    }
    expect(checkStatusSubscribeRateLimit("b", now).ok).toBe(true);
  });
});
