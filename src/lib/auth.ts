import type { AstroCookies } from "astro";
import { createAuthClient } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";

export type AuthResult = {
  session: Session | null;
  user: User | null;
};

export async function getAuthFromCookies(
  cookies: AstroCookies,
): Promise<AuthResult> {
  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");

  if (!accessToken || !refreshToken) {
    return { session: null, user: null };
  }

  try {
    // Fresh client per call -- never the shared `supabase` singleton here.
    // getAuthFromCookies runs on essentially every request, and Cloudflare
    // Workers can interleave concurrent requests within one isolate's
    // shared global scope, so a shared client's setSession() would be a
    // race: whichever request last called it "wins" the ambient session
    // that other in-flight requests' auth calls would then silently read.
    const client = createAuthClient();
    const { data, error } = await client.auth.setSession({
      access_token: accessToken.value,
      refresh_token: refreshToken.value,
    });

    if (error || !data.session) {
      clearAuthCookies(cookies);
      return { session: null, user: null };
    }

    return { session: data.session, user: data.user };
  } catch {
    clearAuthCookies(cookies);
    return { session: null, user: null };
  }
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
