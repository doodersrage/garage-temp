/** Per-isolate contact form abuse controls (rate + honeypot helpers). */

export const CONTACT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const CONTACT_RATE_LIMIT_MAX = 5;
export const CONTACT_MAX_MESSAGE_CHARS = 8000;
export const CONTACT_HONEYPOT_FIELD = "company";

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();

export function resetContactRateLimitStateForTests(): void {
  rateBuckets.clear();
}

export function isContactHoneypotTriggered(value: FormDataEntryValue | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function checkContactRateLimit(
  key: string,
  now = Date.now(),
): { ok: boolean; retryAfterSec?: number; error?: string } {
  const existing = rateBuckets.get(key);
  if (!existing || now >= existing.resetAt) {
    rateBuckets.set(key, {
      count: 1,
      resetAt: now + CONTACT_RATE_LIMIT_WINDOW_MS,
    });
    return { ok: true };
  }

  if (existing.count >= CONTACT_RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      ok: false,
      retryAfterSec,
      error: "Too many messages. Please try again in a few minutes.",
    };
  }

  existing.count += 1;
  return { ok: true };
}
