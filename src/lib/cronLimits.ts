/** Per-isolate rate limit for the documented manual cron endpoint. */

export const CRON_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const CRON_RATE_LIMIT_MAX = 10;

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();

export function resetCronRateLimitStateForTests(): void {
  rateBuckets.clear();
}

export function checkCronRateLimit(
  key: string,
  now = Date.now(),
): { ok: boolean; retryAfterSec?: number; error?: string } {
  const existing = rateBuckets.get(key);
  if (!existing || now >= existing.resetAt) {
    rateBuckets.set(key, {
      count: 1,
      resetAt: now + CRON_RATE_LIMIT_WINDOW_MS,
    });
    return { ok: true };
  }

  if (existing.count >= CRON_RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      ok: false,
      retryAfterSec,
      error: "Rate limit exceeded. Try again shortly.",
    };
  }

  existing.count += 1;
  return { ok: true };
}
