import type { AstroCookies } from "astro";
import { createAuthClient } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";

export type AuthResult = {
  session: Session | null;
  user: User | null;
};

/** Native companions (Android / Bay Buddy) send tokens as headers instead of cookies. */
export const ACCESS_HEADER = "authorization";
export const REFRESH_HEADER = "x-sb-refresh-token";
export const MFA_HEADER = "x-sb-mfa-required";

async function sessionFromTokens(
  accessToken: string,
  refreshToken: string,
): Promise<AuthResult> {
  try {
    // Fresh client per call -- never the shared `supabase` singleton here.
    // Auth runs on essentially every request, and Cloudflare Workers can
    // interleave concurrent requests within one isolate's shared global
    // scope, so a shared client's setSession() would be a race.
    const client = createAuthClient();
    const { data, error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      return { session: null, user: null };
    }

    return { session: data.session, user: data.user };
  } catch {
    return { session: null, user: null };
  }
}

function bearerAccessToken(request: Request): string | null {
  const header = request.headers.get(ACCESS_HEADER);
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

/**
 * Resolve the signed-in user from either:
 * - HttpOnly cookies (web dashboard), or
 * - Authorization Bearer + X-SB-Refresh-Token (native / desktop companions)
 */
export async function getAuthFromRequest(
  request: Request,
  cookies: AstroCookies,
): Promise<AuthResult> {
  const access = bearerAccessToken(request);
  const refresh = request.headers.get(REFRESH_HEADER)?.trim();
  if (access && refresh) {
    return sessionFromTokens(access, refresh);
  }
  return getAuthFromCookies(cookies);
}

export async function getAuthFromCookies(
  cookies: AstroCookies,
): Promise<AuthResult> {
  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");

  if (!accessToken || !refreshToken) {
    return { session: null, user: null };
  }

  const result = await sessionFromTokens(accessToken.value, refreshToken.value);
  if (!result.session) {
    clearAuthCookies(cookies);
  }
  return result;
}

/** MFA gate helpers also honor companion headers. */
export function companionMfaHeaderValue(request: Request): string | null {
  return request.headers.get(MFA_HEADER)?.trim() || null;
}

export function clearAuthCookies(cookies: AstroCookies): void {
  cookies.delete("sb-access-token", { path: "/" });
  cookies.delete("sb-refresh-token", { path: "/" });
}

export function setAuthCookies(
  cookies: AstroCookies,
  accessToken: string,
  refreshToken: string,
): void {
  const secure = import.meta.env.PROD;
  const cookieOptions = {
    path: "/",
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
  };

  cookies.set("sb-access-token", accessToken, cookieOptions);
  cookies.set("sb-refresh-token", refreshToken, cookieOptions);
}
