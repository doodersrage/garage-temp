import type { AstroCookies } from "astro";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

/** Fixed storage key so sign-in and callback share the same PKCE cookie name. */
export const OAUTH_STORAGE_KEY = "sb-oauth-flow";

/** HttpOnly cookie holding the PKCE code verifier between OAuth hops. */
export const OAUTH_PKCE_COOKIE = "sb-oauth-pkce";

function getSupabaseUrl(): string {
  return import.meta.env.SUPABASE_URL;
}

function getAnonKey(): string {
  return import.meta.env.SUPABASE_ANON_KEY;
}

/**
 * Minimal storage adapter: Supabase Auth only needs `${storageKey}-code-verifier`
 * for server-side PKCE OAuth. Persist it in a cookie so the callback request
 * (often a different Worker isolate) can call exchangeCodeForSession().
 */
export function createOAuthPkceStorage(cookies: AstroCookies) {
  const cookieOptions = {
    path: "/",
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax" as const,
    maxAge: 60 * 10,
  };

  const verifierKey = `${OAUTH_STORAGE_KEY}-code-verifier`;

  return {
    getItem(key: string): string | null {
      if (key !== verifierKey) return null;
      return cookies.get(OAUTH_PKCE_COOKIE)?.value ?? null;
    },
    setItem(key: string, value: string): void {
      if (key !== verifierKey) return;
      cookies.set(OAUTH_PKCE_COOKIE, value, cookieOptions);
    },
    removeItem(key: string): void {
      if (key !== verifierKey) return;
      cookies.delete(OAUTH_PKCE_COOKIE, { path: "/" });
    },
  };
}

export function clearOAuthPkceCookie(cookies: AstroCookies): void {
  cookies.delete(OAUTH_PKCE_COOKIE, { path: "/" });
}

/** Request-scoped Supabase client for OAuth sign-in and callback exchange. */
export function createOAuthAuthClient(cookies: AstroCookies): SupabaseClient<Database> {
  return createClient<Database>(getSupabaseUrl(), getAnonKey(), {
    auth: {
      autoRefreshToken: false,
      // Must be true or GoTrueClient ignores `storage` and keeps PKCE in memory
      // (lost across Worker isolates on the OAuth callback hop).
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
      storageKey: OAUTH_STORAGE_KEY,
      storage: createOAuthPkceStorage(cookies),
    },
  });
}
