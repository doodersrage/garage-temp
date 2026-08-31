/**
 * Per-isolate abuse controls for the inbound Telegram command webhook.
 *
 * /api/telegram/webhook authenticates entirely with a shared secret in
 * the query string (?secret=...) -- there's no bot-token check or
 * request signature. This limiter slows down an attacker probing that
 * endpoint with guessed secrets from one source; it's defense in depth
 * alongside requiring a sufficiently long secret at save time
 * (see isWeakTelegramSecret in alertSettingsForm.ts) which is the real
 * fix for guessability.
 */

export const TELEGRAM_WEBHOOK_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const TELEGRAM_WEBHOOK_RATE_LIMIT_MAX = 30;

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();

export function resetTelegramWebhookRateLimitStateForTests(): void {
  rateBuckets.clear();
}

export function checkTelegramWebhookRateLimit(
  key: string,
  now = Date.now(),
): { ok: boolean; retryAfterSec?: number } {
  const existing = rateBuckets.get(key);
  if (!existing || now >= existing.resetAt) {
    rateBuckets.set(key, {
      count: 1,
      resetAt: now + TELEGRAM_WEBHOOK_RATE_LIMIT_WINDOW_MS,
    });
    return { ok: true };
  }

  if (existing.count >= TELEGRAM_WEBHOOK_RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }

  existing.count += 1;
  return { ok: true };
}
