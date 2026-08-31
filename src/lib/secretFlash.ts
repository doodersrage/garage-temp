import type { AstroCookies } from "astro";

/**
 * Short-lived HttpOnly cookies for one-time secrets (ingest keys, API keys,
 * share tokens). Prefer these over putting secrets in redirect query strings
 * (history, Referer, proxy logs).
 */

const FLASH_MAX_AGE_SEC = 5 * 60;

function flashOptions() {
  return {
    path: "/",
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax" as const,
    maxAge: FLASH_MAX_AGE_SEC,
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
): void {
  cookies.set(name, value, flashOptions());
}

/** Read and clear a one-time secret cookie. */
export function consumeSecretFlash(
  cookies: AstroCookies,
  name: string,
): string | null {
  const value = cookies.get(name)?.value?.trim() || null;
  if (value) {
    cookies.delete(name, { path: "/" });
  }
  return value;
}
