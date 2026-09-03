import type { AstroCookies } from "astro";
import { resolveConfiguredSiteUrl } from "./siteConfig";
import {
  createMobileExchangeToken,
  MOBILE_APP_SCHEME,
  MOBILE_OAUTH_COOKIE,
  MOBILE_OAUTH_HOST,
  MOBILE_OAUTH_HTTPS_PATH,
} from "./mobileAuthExchange";

export function setMobileOAuthCookie(cookies: AstroCookies): void {
  cookies.set(MOBILE_OAUTH_COOKIE, "1", {
    path: "/",
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    maxAge: 60 * 15,
  });
}

export function hasMobileOAuthCookie(cookies: AstroCookies): boolean {
  return cookies.get(MOBILE_OAUTH_COOKIE)?.value === "1";
}

export function consumeMobileOAuthCookie(cookies: AstroCookies): boolean {
  const value = hasMobileOAuthCookie(cookies);
  cookies.delete(MOBILE_OAUTH_COOKIE, { path: "/" });
  return value;
}

export function buildMobileOAuthCustomUrl(exchange: string): string {
  return `${MOBILE_APP_SCHEME}://${MOBILE_OAUTH_HOST}?exchange=${encodeURIComponent(exchange)}`;
}

export function buildMobileOAuthHttpsUrl(exchange: string, siteUrl?: string | URL | null): string {
  const origin = resolveConfiguredSiteUrl(siteUrl);
  return `${origin}${MOBILE_OAUTH_HTTPS_PATH}?exchange=${encodeURIComponent(exchange)}`;
}

/** Chrome-friendly intent URI; user taps or JS navigates here after YubiKey/WebAuthn. */
export function buildMobileOAuthIntentUrl(exchange: string): string {
  const encoded = encodeURIComponent(exchange);
  return `intent://${MOBILE_OAUTH_HOST}?exchange=${encoded}#Intent;scheme=${MOBILE_APP_SCHEME};package=${MOBILE_APP_SCHEME};end`;
}

/**
 * Hand tokens back to the Android app via HTTPS `/app/oauth` (Chrome blocks
 * custom-scheme 302s after Google / security-key flows).
 */
export async function redirectMobileOAuthComplete(
  accessToken: string,
  refreshToken: string,
  siteUrl?: string | URL | null,
): Promise<Response | null> {
  const exchange = await createMobileExchangeToken(accessToken, refreshToken);
  if (!exchange) return null;

  return new Response(null, {
    status: 302,
    headers: {
      Location: buildMobileOAuthHttpsUrl(exchange, siteUrl),
      "Cache-Control": "no-store",
    },
  });
}

/**
 * If this request is part of a native-app OAuth round trip, finish by sending
 * the session back to the app. Consumes the mobile cookie only on success so a
 * failed exchange can still recover via web MFA → app return.
 */
export async function maybeRedirectMobileOAuth(
  cookies: AstroCookies,
  accessToken: string,
  refreshToken: string,
  siteUrl?: string | URL | null,
): Promise<Response | null> {
  if (!hasMobileOAuthCookie(cookies)) return null;
  const redirect = await redirectMobileOAuthComplete(accessToken, refreshToken, siteUrl);
  if (!redirect) return null;
  consumeMobileOAuthCookie(cookies);
  return redirect;
}
