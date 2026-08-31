/**
 * Per-isolate abuse controls for the inbound Telegram command webhook.
 *
 * Auth prefers X-Telegram-Bot-Api-Secret-Token (setWebhook secret_token),
 * with legacy ?secret= still accepted, plus optional chat-id binding.
 * This limiter slows secret guessing from one client address.
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
