/** Per-user rate limit for recoverable ingest key reveal (sensitive). */

export const REVEAL_INGEST_KEY_WINDOW_MS = 60 * 60 * 1000;
export const REVEAL_INGEST_KEY_MAX = 10;

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();

export function resetRevealIngestKeyRateLimitStateForTests(): void {
  rateBuckets.clear();
}

export function checkRevealIngestKeyRateLimit(
  userId: string,
  now = Date.now(),
): { ok: boolean; retryAfterSec?: number } {
  const existing = rateBuckets.get(userId);
  if (!existing || now >= existing.resetAt) {
    rateBuckets.set(userId, {
      count: 1,
      resetAt: now + REVEAL_INGEST_KEY_WINDOW_MS,
    });
    return { ok: true };
  }

  if (existing.count >= REVEAL_INGEST_KEY_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }

  existing.count += 1;
  return { ok: true };
}
