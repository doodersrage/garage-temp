import { afterEach, describe, expect, it } from "vitest";
import {
  checkContactRateLimit,
  CONTACT_RATE_LIMIT_MAX,
  isContactHoneypotTriggered,
  resetContactRateLimitStateForTests,
} from "./contactLimits";

afterEach(() => {
  resetContactRateLimitStateForTests();
});

describe("contact honeypot", () => {
  it("treats filled hidden fields as bots", () => {
    expect(isContactHoneypotTriggered(null)).toBe(false);
    expect(isContactHoneypotTriggered("")).toBe(false);
    expect(isContactHoneypotTriggered("   ")).toBe(false);
    expect(isContactHoneypotTriggered("Acme Inc")).toBe(true);
  });
});

describe("contact rate limit", () => {
  it("allows a burst then blocks", () => {
    const now = Date.parse("2026-08-30T12:00:00.000Z");
    for (let i = 0; i < CONTACT_RATE_LIMIT_MAX; i += 1) {
      expect(checkContactRateLimit("1.1.1.1", now).ok).toBe(true);
    }
    const blocked = checkContactRateLimit("1.1.1.1", now);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates keys", () => {
    const now = Date.parse("2026-08-30T12:00:00.000Z");
    for (let i = 0; i < CONTACT_RATE_LIMIT_MAX; i += 1) {
      expect(checkContactRateLimit("a", now).ok).toBe(true);
    }
    expect(checkContactRateLimit("b", now).ok).toBe(true);
  });
});
