import { timingSafeEqual } from "./timingSafeEqual";

type ExchangePayload = {
  a: string;
  r: string;
  exp: number;
};

function getSecret(): string | null {
  const secret =
    import.meta.env.CRON_SECRET?.trim() ||
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return secret || null;
}

function base64UrlEncode(data: string): string {
  const bytes = new TextEncoder().encode(data);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(data: string): string | null {
  try {
    const padded = data.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? padded : padded + "=".repeat(4 - (padded.length % 4));
    const binary = atob(pad);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(sig)));
}

async function verify(payload: string, signature: string, secret: string): Promise<boolean> {
  const expected = await sign(payload, secret);
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(expected, signature);
}

/** Short-lived signed token for handing a web OAuth session to the native app. */
export async function createMobileExchangeToken(
  accessToken: string,
  refreshToken: string,
): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;

  const payload: ExchangePayload = {
    a: accessToken,
    r: refreshToken,
    exp: Date.now() + 120_000,
  };
  const payloadStr = JSON.stringify(payload);
  const signature = await sign(payloadStr, secret);
  return `${base64UrlEncode(payloadStr)}.${signature}`;
}

export async function verifyMobileExchangeToken(
  token: string,
): Promise<{ access_token: string; refresh_token: string } | null> {
  const secret = getSecret();
  if (!secret) return null;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const payloadEncoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const payloadStr = base64UrlDecode(payloadEncoded);
  if (!payloadStr) return null;

  const valid = await verify(payloadStr, signature, secret);
  if (!valid) return null;

  let payload: ExchangePayload;
  try {
    payload = JSON.parse(payloadStr) as ExchangePayload;
  } catch {
    return null;
  }

  if (!payload.a || !payload.r || !payload.exp || payload.exp < Date.now()) {
    return null;
  }

  return { access_token: payload.a, refresh_token: payload.r };
}

export const MOBILE_OAUTH_COOKIE = "mobile_oauth";
export const MOBILE_APP_SCHEME = "dev.thermaltrace.android";
/** Host for the custom-scheme return URI (`dev.thermaltrace.android://oauth`). */
export const MOBILE_OAUTH_HOST = "oauth";
/** HTTPS App Link path Chrome can open after Google/YubiKey (custom-scheme 302s are blocked). */
export const MOBILE_OAUTH_HTTPS_PATH = "/app/oauth";
