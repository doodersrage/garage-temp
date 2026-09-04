import { timingSafeEqualHex } from "./timingSafeEqual";

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Prefer ThermalTrace header; accept legacy GarageTemp and generic X-Signature. */
export function pickInboundSignatureHeader(headers: Headers): string | null {
  return (
    headers.get("X-ThermalTrace-Signature") ||
    headers.get("X-GarageTemp-Signature") ||
    headers.get("X-Signature")
  );
}

export async function verifyInboundSignature(
  secret: string | null | undefined,
  rawBody: string,
  header: string | null,
): Promise<boolean> {
  // Fail closed: unsigned legacy rows must rotate/recreate to get a secret.
  if (!secret?.trim()) return false;
  if (!header?.trim()) return false;

  const expected = await hmacSha256Hex(secret.trim(), rawBody);
  const provided = header.replace(/^sha256=/i, "").trim().toLowerCase();
  return timingSafeEqualHex(expected, provided);
}

export function randomSigningSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `gts_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
