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

export async function verifyInboundSignature(
  secret: string | null | undefined,
  rawBody: string,
  header: string | null,
): Promise<boolean> {
  if (!secret?.trim()) return true;
  if (!header?.trim()) return false;

  const expected = await hmacSha256Hex(secret.trim(), rawBody);
  const provided = header.replace(/^sha256=/i, "").trim().toLowerCase();
  return expected === provided;
}

export function randomSigningSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `gts_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
