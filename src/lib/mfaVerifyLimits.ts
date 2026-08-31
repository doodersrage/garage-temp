/**
 * Per-isolate abuse control for the MFA (TOTP) verification step.
 *
 * A 6-digit TOTP code has only 1,000,000 possible values, and reaching
 * this endpoint at all already means the caller has a valid primary
 * session (password verified) -- this is precisely the "attacker has the
 * password, MFA is the last line of defense" moment, so unlimited
 * guessing here would make MFA far weaker than intended. Supabase does
 * not rate-limit MFA verification attempts by default (that's left to the
 * app via the MFA Verification Attempt auth hook or, as here, app-level
 * throttling) -- this mirrors the existing signinLimits.ts pattern, keyed
 * by user id instead of email since MFA verify always happens against an
 * already-authenticated session.
 */

export const MFA_VERIFY_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const MFA_VERIFY_RATE_LIMIT_MAX_FAILURES = 5;

type FailureBucket = { count: number; resetAt: number };

const failureBuckets = new Map<string, FailureBucket>();

export function resetMfaVerifyRateLimitStateForTests(): void {
  failureBuckets.clear();
}

/** Call before attempting verification. Does not itself count as an attempt. */
export function checkMfaVerifyRateLimit(
  userId: string,
  now = Date.now(),
): { ok: boolean; retryAfterSec?: number } {
  const existing = failureBuckets.get(userId);
  if (!existing || now >= existing.resetAt) {
    return { ok: true };
  }
  if (existing.count >= MFA_VERIFY_RATE_LIMIT_MAX_FAILURES) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  return { ok: true };
}

/** Call after a failed code verification. */
export function recordMfaVerifyFailure(userId: string, now = Date.now()): void {
  const existing = failureBuckets.get(userId);
  if (!existing || now >= existing.resetAt) {
    failureBuckets.set(userId, {
      count: 1,
      resetAt: now + MFA_VERIFY_RATE_LIMIT_WINDOW_MS,
    });
    return;
  }
  existing.count += 1;
}

/** Call after a successful verification so a legitimate user isn't left throttled. */
export function clearMfaVerifyFailures(userId: string): void {
  failureBuckets.delete(userId);
}
