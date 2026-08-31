import { afterEach, describe, expect, it } from "vitest";
import {
  checkTelegramWebhookRateLimit,
  resetTelegramWebhookRateLimitStateForTests,
  TELEGRAM_WEBHOOK_RATE_LIMIT_MAX,
} from "./telegramWebhookLimits";

afterEach(() => {
  resetTelegramWebhookRateLimitStateForTests();
});

describe("telegram webhook rate limit", () => {
  it("allows a burst then blocks", () => {
    const now = Date.parse("2026-08-31T12:00:00.000Z");
    for (let i = 0; i < TELEGRAM_WEBHOOK_RATE_LIMIT_MAX; i += 1) {
      expect(checkTelegramWebhookRateLimit("1.1.1.1", now).ok).toBe(true);
    }
    const blocked = checkTelegramWebhookRateLimit("1.1.1.1", now);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates by key so one IP can't exhaust another's budget", () => {
    const now = Date.parse("2026-08-31T12:00:00.000Z");
    for (let i = 0; i < TELEGRAM_WEBHOOK_RATE_LIMIT_MAX; i += 1) {
      expect(checkTelegramWebhookRateLimit("attacker-ip", now).ok).toBe(true);
    }
    expect(checkTelegramWebhookRateLimit("telegram-server-ip", now).ok).toBe(true);
  });

  it("resets after the window passes", () => {
    const now = Date.parse("2026-08-31T12:00:00.000Z");
    for (let i = 0; i < TELEGRAM_WEBHOOK_RATE_LIMIT_MAX; i += 1) {
      checkTelegramWebhookRateLimit("1.2.3.4", now);
    }
    expect(checkTelegramWebhookRateLimit("1.2.3.4", now).ok).toBe(false);
    expect(checkTelegramWebhookRateLimit("1.2.3.4", now + 61_000).ok).toBe(true);
  });
});
