/** Simple per-isolate ingest abuse controls (body size + request rate). */

export const INGEST_MAX_BODY_BYTES = 64 * 1024;
export const INGEST_RATE_LIMIT_WINDOW_MS = 60_000;
export const INGEST_RATE_LIMIT_MAX = 60;

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();

export function resetIngestRateLimitStateForTests(): void {
  rateBuckets.clear();
}

export function checkIngestBodySize(contentLengthHeader: string | null): {
  ok: boolean;
  error?: string;
} {
  if (!contentLengthHeader) return { ok: true };
  const length = Number(contentLengthHeader);
  if (!Number.isFinite(length) || length < 0) return { ok: true };
  if (length > INGEST_MAX_BODY_BYTES) {
    return {
      ok: false,
      error: `Payload too large (max ${INGEST_MAX_BODY_BYTES} bytes)`,
    };
  }
  return { ok: true };
}

export function checkIngestRateLimit(
  key: string,
  now = Date.now(),
): { ok: boolean; retryAfterSec?: number; error?: string } {
  const existing = rateBuckets.get(key);
  if (!existing || now >= existing.resetAt) {
    rateBuckets.set(key, {
      count: 1,
      resetAt: now + INGEST_RATE_LIMIT_WINDOW_MS,
    });
    return { ok: true };
  }

  if (existing.count >= INGEST_RATE_LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      ok: false,
      retryAfterSec,
      error: "Rate limit exceeded. Try again shortly.",
    };
  }

  existing.count += 1;
  return { ok: true };
}

export async function readJsonBodyWithLimit(
  request: Request,
  maxBytes = INGEST_MAX_BODY_BYTES,
): Promise<{ ok: true; payload: unknown } | { ok: false; error: string; status: number }> {
  const sizeCheck = checkIngestBodySize(request.headers.get("content-length"));
  if (!sizeCheck.ok) {
    return { ok: false, error: sizeCheck.error!, status: 413 };
  }

  const buffer = await request.arrayBuffer();
  if (buffer.byteLength > maxBytes) {
    return {
      ok: false,
      error: `Payload too large (max ${maxBytes} bytes)`,
      status: 413,
    };
  }

  try {
    const text = new TextDecoder().decode(buffer);
    if (!text.trim()) {
      return { ok: false, error: "Invalid JSON", status: 400 };
    }
    return { ok: true, payload: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, error: "Invalid JSON", status: 400 };
  }
}
