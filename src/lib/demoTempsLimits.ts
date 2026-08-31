/**
 * Per-isolate abuse controls for the public, unauthenticated demo-temps
 * endpoint (/api/home/demo-temps). It has no auth of its own and, unlike a
 * cached static asset, every request triggers a live outbound fetch() to
 * the demo device's feed URL -- so without a limit anyone can hammer this
 * endpoint to drive load against that feed source, independent of the
 * "Cache-Control" header (which is only advisory for clients/CDN and isn't
 * enforced at the Worker itself).
 */

export const DEMO_TEMPS_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const DEMO_TEMPS_RATE_LIMIT_MAX = 30;

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();

export function resetDemoTempsRateLimitStateForTests(): void {
  rateBuckets.clear();
}

export function checkDemoTempsRateLimit(
  key: string,
  now = Date.now(),
): { ok: boolean; retryAfterSec?: number } {
  const existing = rateBuckets.get(key);
  if (!existing || now >= existing.resetAt) {
    rateBuckets.set(key, {
      count: 1,
      resetAt: now + DEMO_TEMPS_RATE_LIMIT_WINDOW_MS,
    });
    return { ok: true };
  }

  if (existing.count >= DEMO_TEMPS_RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }

  existing.count += 1;
  return { ok: true };
}
