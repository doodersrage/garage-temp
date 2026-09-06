import type { APIRoute } from "astro";
import { MFA_REQUIRED_COOKIE } from "../../../lib/mfa";
import { clearMfaStepUpCookie } from "../../../lib/mfaStepUpProof";
import { sanitizeNextPath } from "../../../lib/siteUrl";

function clearSession(cookies: Parameters<APIRoute>[0]["cookies"]): void {
  cookies.delete("sb-access-token", { path: "/" });
  cookies.delete("sb-refresh-token", { path: "/" });
  cookies.delete(MFA_REQUIRED_COOKIE, { path: "/" });
  clearMfaStepUpCookie(cookies);
}

function signOutRedirect(url: URL): string {
  const safeNext = sanitizeNextPath(url.searchParams.get("next"));
  const email = url.searchParams.get("email")?.trim() ?? "";
  if (safeNext) {
    const params = new URLSearchParams({ next: safeNext });
    if (email) params.set("email", email);
    return `/signin?${params.toString()}`;
  }
  return "/signin";
}

/** Prefer POST to avoid logout CSRF via image/link GET. */
export const POST: APIRoute = async ({ cookies, redirect, url }) => {
  clearSession(cookies);
  return redirect(signOutRedirect(url));
};

/** GET kept for existing nav links; clears session (SameSite=Lax mitigates CSRF). */
export const GET: APIRoute = async ({ cookies, redirect, url }) => {
  clearSession(cookies);
  return redirect(signOutRedirect(url));
};
