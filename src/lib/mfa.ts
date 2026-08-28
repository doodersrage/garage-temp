import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";
import type { Database } from "../types/supabase";
import { sanitizeNextPath } from "./siteUrl";

export const MFA_REQUIRED_COOKIE = "sb-mfa-required";

export type AalLevel = "aal1" | "aal2";

export type AssuranceLevels = {
  currentLevel: AalLevel | null;
  nextLevel: AalLevel | null;
};

function getSupabaseUrl(): string {
  return import.meta.env.SUPABASE_URL;
}

function getAnonKey(): string {
  return import.meta.env.SUPABASE_ANON_KEY;
}

/** Ephemeral auth client so MFA/sign-in does not race the shared singleton. */
export function createAuthClient(): SupabaseClient<Database> {
  return createClient<Database>(getSupabaseUrl(), getAnonKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
}

export function decodeAccessTokenPayload(
  accessToken: string,
): Record<string, unknown> | null {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return null;
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getAalClaim(accessToken: string): AalLevel | null {
  const payload = decodeAccessTokenPayload(accessToken);
  const aal = payload?.aal;
  if (aal === "aal1" || aal === "aal2") return aal;
  return null;
}

export async function getAssuranceLevels(
  client: SupabaseClient<Database>,
): Promise<AssuranceLevels | null> {
  const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return null;
  return {
    currentLevel: (data.currentLevel as AalLevel | null) ?? null,
    nextLevel: (data.nextLevel as AalLevel | null) ?? null,
  };
}

/** True when password/OAuth succeeded but a verified TOTP factor still needs entry. */
export function needsMfaStepUp(levels: AssuranceLevels | null | undefined): boolean {
  return levels?.currentLevel === "aal1" && levels?.nextLevel === "aal2";
}

export async function sessionNeedsMfaStepUp(
  accessToken: string,
  refreshToken: string,
): Promise<boolean> {
  if (getAalClaim(accessToken) === "aal2") return false;

  const client = createAuthClient();
  const { data, error } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error || !data.session) return false;

  const levels = await getAssuranceLevels(client);
  return needsMfaStepUp(levels);
}

export function setMfaRequiredCookie(
  cookies: AstroCookies,
  required: boolean | "clear",
): void {
  if (required === "clear") {
    cookies.delete(MFA_REQUIRED_COOKIE, { path: "/" });
    return;
  }

  cookies.set(MFA_REQUIRED_COOKIE, required ? "1" : "0", {
    path: "/",
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    // Remember "not required" longer so aal1 sessions without MFA stay cheap.
    maxAge: required ? 60 * 15 : 60 * 60 * 24,
  });
}

export function isMfaRequiredCookieSet(cookies: AstroCookies): boolean {
  return cookies.get(MFA_REQUIRED_COOKIE)?.value === "1";
}

export function isMfaCheckedNotRequired(cookies: AstroCookies): boolean {
  return cookies.get(MFA_REQUIRED_COOKIE)?.value === "0";
}

export function buildMfaChallengeUrl(next?: string | null): string {
  const safeNext = sanitizeNextPath(next ?? undefined);
  if (!safeNext || safeNext === "/dashboard") return "/signin/mfa";
  return `/signin/mfa?next=${encodeURIComponent(safeNext)}`;
}

export async function applySessionCookiesAfterAuth(
  cookies: AstroCookies,
  session: Session,
  nextPath?: string | null,
): Promise<{ redirectTo: string }> {
  const { setAuthCookies } = await import("./auth");
  setAuthCookies(cookies, session.access_token, session.refresh_token);

  const client = createAuthClient();
  await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  const levels = await getAssuranceLevels(client);
  const stepUp = needsMfaStepUp(levels);
  setMfaRequiredCookie(cookies, stepUp);

  const safeNext = sanitizeNextPath(nextPath ?? undefined) ?? "/dashboard";
  return {
    redirectTo: stepUp ? buildMfaChallengeUrl(safeNext) : safeNext,
  };
}

/** Restore cookie session onto an ephemeral auth client for MFA admin APIs. */
export async function createAuthClientFromSession(
  accessToken: string,
  refreshToken: string,
): Promise<{ client: SupabaseClient<Database>; error: string | null }> {
  const client = createAuthClient();
  const { data, error } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error || !data.session) {
    return { client, error: error?.message ?? "Session expired" };
  }
  return { client, error: null };
}

/** Refresh MFA-required cookie from the live assurance level (not just JWT claim). */
export async function syncMfaRequiredCookieFromClient(
  cookies: AstroCookies,
  client: SupabaseClient<Database>,
  accessToken?: string,
): Promise<void> {
  if (accessToken && getAalClaim(accessToken) === "aal2") {
    setMfaRequiredCookie(cookies, false);
    return;
  }
  const levels = await getAssuranceLevels(client);
  setMfaRequiredCookie(cookies, needsMfaStepUp(levels));
}
