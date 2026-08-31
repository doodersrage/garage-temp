/**
 * Constant-time comparison for two strings. A plain `===` comparison
 * short-circuits on the first mismatched character, which leaks how many
 * leading characters were correct via response timing -- letting an
 * attacker recover a valid secret byte-by-byte over many requests. This
 * always walks the full length of both strings before returning,
 * regardless of where they first differ.
 *
 * Returns false (without early exit) if the strings differ in length,
 * since two different-length secrets can never be a valid match anyway.
 */
function constantTimeCharEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a dummy constant-time-ish pass so callers can't distinguish
    // "wrong length" from "right length, wrong content" by timing alone.
    let dummy = 0;
    for (let i = 0; i < a.length; i += 1) dummy |= a.charCodeAt(i) ^ 0;
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Constant-time comparison for two lowercase hex strings (e.g. hex-encoded HMAC signatures). */
export function timingSafeEqualHex(a: string, b: string): boolean {
  return constantTimeCharEqual(a, b);
}

/** Constant-time comparison for an arbitrary secret string (e.g. a bearer token). */
export function timingSafeEqual(a: string, b: string): boolean {
  return constantTimeCharEqual(a, b);
}
