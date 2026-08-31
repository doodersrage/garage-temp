/** Per-isolate abuse controls for the public status-page subscribe form. */

export const STATUS_SUBSCRIBE_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const STATUS_SUBSCRIBE_RATE_LIMIT_MAX = 5;
export const STATUS_SUBSCRIBE_HONEYPOT_FIELD = "company";

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();

export function resetStatusSubscribeRateLimitStateForTests(): void {
  rateBuckets.clear();
}

export function isStatusSubscribeHoneypotTriggered(
  value: FormDataEntryValue | null,
): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function checkStatusSubscribeRateLimit(
  key: string,
  now = Date.now(),
): { ok: boolean; retryAfterSec?: number; error?: string } {
  const existing = rateBuckets.get(key);
  if (!existing || now >= existing.resetAt) {
    rateBuckets.set(key, {
      count: 1,
      resetAt: now + STATUS_SUBSCRIBE_RATE_LIMIT_WINDOW_MS,
    });
    return { ok: true };
  }

  if (existing.count >= STATUS_SUBSCRIBE_RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      ok: false,
      retryAfterSec,
      error: "Too many attempts. Please try again in a few minutes.",
    };
  }

  existing.count += 1;
  return { ok: true };
}
