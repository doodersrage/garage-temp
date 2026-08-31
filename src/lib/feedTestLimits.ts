/**
 * Per-isolate rate limit for authenticated feed URL tests (/api/feeds/test).
 * Each call triggers an outbound Worker fetch to a user-supplied HTTPS URL.
 */

export const FEED_TEST_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const FEED_TEST_RATE_LIMIT_MAX = 10;

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();

export function resetFeedTestRateLimitStateForTests(): void {
  rateBuckets.clear();
}

export function checkFeedTestRateLimit(
  key: string,
  now = Date.now(),
): { ok: boolean; retryAfterSec?: number } {
  const existing = rateBuckets.get(key);
  if (!existing || now >= existing.resetAt) {
    rateBuckets.set(key, {
      count: 1,
      resetAt: now + FEED_TEST_RATE_LIMIT_WINDOW_MS,
    });
    return { ok: true };
  }

  if (existing.count >= FEED_TEST_RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }

  existing.count += 1;
  return { ok: true };
}
