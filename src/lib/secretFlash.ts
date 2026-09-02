import type { AstroCookies } from "astro";

/**
 * Short-lived HttpOnly cookies for one-time secrets (ingest keys, API keys,
 * share tokens). Prefer these over putting secrets in redirect query strings
 * (history, Referer, proxy logs).
 */

/** Ingest keys stay recoverable on refresh until dismissed or TTL expires. */
export const FLASH_INGEST_TTL_SEC = 30 * 60;
const FLASH_DEFAULT_TTL_SEC = 5 * 60;

function flashOptions(maxAgeSec = FLASH_DEFAULT_TTL_SEC) {
  return {
    path: "/",
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax" as const,
    maxAge: maxAgeSec,
  };
}

export const FLASH_INGEST_KEY = "tt_flash_ingest_key";
export const FLASH_API_KEY = "tt_flash_api_key";
export const FLASH_SHARE_TOKEN = "tt_flash_share_token";
export const FLASH_STATUS_TOKEN = "tt_flash_status_token";
export const FLASH_INBOUND_TOKEN = "tt_flash_inbound_token";
export const FLASH_INBOUND_SIGNING = "tt_flash_inbound_signing";

export function setSecretFlash(
  cookies: AstroCookies,
  name: string,
  value: string,
  maxAgeSec?: number,
): void {
  const ttl =
    maxAgeSec ??
    (name === FLASH_INGEST_KEY ? FLASH_INGEST_TTL_SEC : FLASH_DEFAULT_TTL_SEC);
  cookies.set(name, value, flashOptions(ttl));
}

/** Read a flash cookie without clearing it (ingest key recovery on refresh). */
export function peekSecretFlash(cookies: AstroCookies, name: string): string | null {
  return cookies.get(name)?.value?.trim() || null;
}

/** Read and clear a one-time secret cookie. */
export function consumeSecretFlash(
  cookies: AstroCookies,
  name: string,
): string | null {
  const value = peekSecretFlash(cookies, name);
  if (value) {
    cookies.delete(name, { path: "/" });
  }
  return value;
}

export function clearSecretFlash(cookies: AstroCookies, name: string): void {
  cookies.delete(name, { path: "/" });
}
