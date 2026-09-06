import type { AstroCookies } from "astro";

export const COMPANION_CLIENT_COOKIE = "companion_client";
export const COMPANION_LOOPBACK_COOKIE = "companion_loopback";

export const BAYBUDDY_APP_SCHEME = "com.thermaltrace.baybuddy";
export const DESKTOP_APP_SCHEME = "com.thermaltrace.desktop";
export type CompanionClient = "baybuddy" | "android" | "desktop";

/** Only allow loopback HTTP callbacks from the desktop companion. */
export function isSafeCompanionLoopback(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:") return false;
    if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
      return false;
    }
    if (parsed.pathname !== "/oauth" && parsed.pathname !== "/callback") {
      return false;
    }
    // Ephemeral desktop ports — reject privileged / empty
    const port = Number(parsed.port || "80");
    if (!Number.isFinite(port) || port < 1024 || port > 65535) return false;
    return true;
  } catch {
    return false;
  }
}

export function setCompanionClientCookie(
  cookies: AstroCookies,
  client: CompanionClient,
): void {
  cookies.set(COMPANION_CLIENT_COOKIE, client, {
    path: "/",
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    maxAge: 60 * 15,
  });
}

export function getCompanionClientCookie(
  cookies: AstroCookies,
): CompanionClient | null {
  const value = cookies.get(COMPANION_CLIENT_COOKIE)?.value;
  if (value === "baybuddy" || value === "android" || value === "desktop") {
    return value;
  }
  return null;
}

export function setCompanionLoopbackCookie(
  cookies: AstroCookies,
  loopback: string,
): boolean {
  if (!isSafeCompanionLoopback(loopback)) return false;
  cookies.set(COMPANION_LOOPBACK_COOKIE, loopback, {
    path: "/",
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    maxAge: 60 * 15,
  });
  return true;
}

export function consumeCompanionLoopbackCookie(
  cookies: AstroCookies,
): string | null {
  const value = cookies.get(COMPANION_LOOPBACK_COOKIE)?.value ?? null;
  cookies.delete(COMPANION_LOOPBACK_COOKIE, { path: "/" });
  if (value && isSafeCompanionLoopback(value)) return value;
  return null;
}

export function buildBayBuddyOAuthCustomUrl(exchange: string): string {
  return `${BAYBUDDY_APP_SCHEME}://oauth?exchange=${encodeURIComponent(exchange)}`;
}

export function buildDesktopOAuthCustomUrl(exchange: string): string {
  return `${DESKTOP_APP_SCHEME}://oauth?exchange=${encodeURIComponent(exchange)}`;
}

export function buildLoopbackOAuthUrl(loopback: string, exchange: string): string {
  const target = new URL(loopback);
  target.searchParams.set("exchange", exchange);
  return target.toString();
}

export function parseCompanionClient(
  value: string | null | undefined,
): CompanionClient {
  const v = value?.trim().toLowerCase();
  if (v === "android") return "android";
  if (v === "desktop") return "desktop";
  return "baybuddy";
}
