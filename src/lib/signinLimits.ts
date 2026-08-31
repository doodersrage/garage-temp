/**
 * Per-isolate login abuse controls: throttles repeated failed sign-in attempts
 * by email so credential stuffing can't grind through one target account, even
 * spread across many IPs. This layers on top of Cloudflare Turnstile (which
 * mainly filters bots) with a defense that's actually keyed to the account
 * being attacked. Like the other *Limits modules in this file, state is
 * per-isolate, not globally durable -- a reasonable tradeoff for a throttle,
 * not a hard guarantee.
 */

export const SIGNIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const SIGNIN_RATE_LIMIT_MAX_FAILURES = 8;

type FailureBucket = { count: number; resetAt: number };

const failureBuckets = new Map<string, FailureBucket>();

export function resetSigninRateLimitStateForTests(): void {
  failureBuckets.clear();
}

function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase();
}

/** Call before attempting sign-in. Does not itself count as an attempt. */
export function checkSigninRateLimit(
  email: string,
  now = Date.now(),
): { ok: boolean; retryAfterSec?: number } {
  const existing = failureBuckets.get(normalizeEmailKey(email));
  if (!existing || now >= existing.resetAt) {
    return { ok: true };
  }
  if (existing.count >= SIGNIN_RATE_LIMIT_MAX_FAILURES) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  return { ok: true };
}

/** Call after a failed password check. */
export function recordSigninFailure(email: string, now = Date.now()): void {
  const key = normalizeEmailKey(email);
  const existing = failureBuckets.get(key);
  if (!existing || now >= existing.resetAt) {
    failureBuckets.set(key, {
      count: 1,
      resetAt: now + SIGNIN_RATE_LIMIT_WINDOW_MS,
    });
    return;
  }
  existing.count += 1;
}

/** Call after a successful sign-in so a legitimate user isn't left throttled. */
export function clearSigninFailures(email: string): void {
  failureBuckets.delete(normalizeEmailKey(email));
}
