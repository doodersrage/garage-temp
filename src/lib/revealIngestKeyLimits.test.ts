import { describe, expect, it, beforeEach } from "vitest";
import {
  checkRevealIngestKeyRateLimit,
  REVEAL_INGEST_KEY_MAX,
  resetRevealIngestKeyRateLimitStateForTests,
} from "./revealIngestKeyLimits";

describe("revealIngestKeyLimits", () => {
  beforeEach(() => {
    resetRevealIngestKeyRateLimitStateForTests();
  });

  it("allows up to the hourly limit per user", () => {
    const now = 1_700_000_000_000;
    for (let index = 0; index < REVEAL_INGEST_KEY_MAX; index += 1) {
      expect(checkRevealIngestKeyRateLimit("user-1", now).ok).toBe(true);
    }
    const blocked = checkRevealIngestKeyRateLimit("user-1", now);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("scopes limits per user", () => {
    const now = 1_700_000_000_000;
    for (let index = 0; index < REVEAL_INGEST_KEY_MAX; index += 1) {
      checkRevealIngestKeyRateLimit("user-1", now);
    }
    expect(checkRevealIngestKeyRateLimit("user-2", now).ok).toBe(true);
  });
});
