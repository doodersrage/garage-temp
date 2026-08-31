/**
 * Per-isolate abuse controls for the public, unauthenticated city-search
 * proxy (/api/weather/city-search). It has no auth of its own -- every
 * request burns a call against the site's own OpenWeatherMap API key/quota,
 * so without a limit anyone can run the budget up or exhaust the plan's
 * rate limit for everyone.
 */

export const WEATHER_SEARCH_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const WEATHER_SEARCH_RATE_LIMIT_MAX = 20;

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();

export function resetWeatherSearchRateLimitStateForTests(): void {
  rateBuckets.clear();
}

export function checkWeatherSearchRateLimit(
  key: string,
  now = Date.now(),
): { ok: boolean; retryAfterSec?: number } {
  const existing = rateBuckets.get(key);
  if (!existing || now >= existing.resetAt) {
    rateBuckets.set(key, {
      count: 1,
      resetAt: now + WEATHER_SEARCH_RATE_LIMIT_WINDOW_MS,
    });
    return { ok: true };
  }

  if (existing.count >= WEATHER_SEARCH_RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { ok: false, retryAfterSec };
  }

  existing.count += 1;
  return { ok: true };
}
