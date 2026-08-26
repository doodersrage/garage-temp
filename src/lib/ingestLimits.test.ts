import { describe, expect, it, beforeEach } from "vitest";
import {
  INGEST_RATE_LIMIT_MAX,
  checkIngestBodySize,
  checkIngestRateLimit,
  resetIngestRateLimitStateForTests,
} from "./ingestLimits";

describe("ingest body size", () => {
  it("allows missing or small Content-Length", () => {
    expect(checkIngestBodySize(null).ok).toBe(true);
    expect(checkIngestBodySize("1024").ok).toBe(true);
  });

  it("rejects oversized Content-Length", () => {
    const result = checkIngestBodySize(String(100_000));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/too large/i);
  });
});

describe("ingest rate limit", () => {
  beforeEach(() => {
    resetIngestRateLimitStateForTests();
  });

  it("allows requests under the limit", () => {
    const now = 1_000_000;
    for (let i = 0; i < INGEST_RATE_LIMIT_MAX; i += 1) {
      expect(checkIngestRateLimit("device-a", now).ok).toBe(true);
    }
  });

  it("blocks after the limit and resets after the window", () => {
    const now = 2_000_000;
    for (let i = 0; i < INGEST_RATE_LIMIT_MAX; i += 1) {
      checkIngestRateLimit("device-b", now);
    }

    const blocked = checkIngestRateLimit("device-b", now);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);

    const afterWindow = checkIngestRateLimit("device-b", now + 60_001);
    expect(afterWindow.ok).toBe(true);
  });
});
