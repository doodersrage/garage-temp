import type { AstroCookies } from "astro";
import { supabase } from "./supabase";
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
    const { data, error } = await supabase.auth.setSession({
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
  cookies.set("sb-access-token", accessToken, { path: "/" });
  cookies.set("sb-refresh-token", refreshToken, { path: "/" });
}
