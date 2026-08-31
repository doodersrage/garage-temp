/**
 * Per-isolate rate limit for public share/embed readings JSON.
 * Token possession is the auth; still throttle scrape/amplification.
 */

export const SHARE_READINGS_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const SHARE_READINGS_RATE_LIMIT_MAX = 60;

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();

export function resetShareReadingsRateLimitStateForTests(): void {
  rateBuckets.clear();
}

export function checkShareReadingsRateLimit(
  key: string,
  now = Date.now(),
): { ok: boolean; retryAfterSec?: number } {
  const existing = rateBuckets.get(key);
  if (!existing || now >= existing.resetAt) {
    rateBuckets.set(key, {
      count: 1,
      resetAt: now + SHARE_READINGS_RATE_LIMIT_WINDOW_MS,
    });
    return { ok: true };
  }

  if (existing.count >= SHARE_READINGS_RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }

  existing.count += 1;
  return { ok: true };
}
