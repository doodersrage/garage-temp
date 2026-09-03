import type { APIRoute } from "astro";
import { buildSignInRedirectUrl } from "../../../lib/signInErrors";
import { applySessionCookiesAfterAuth } from "../../../lib/mfa";
import {
  mapOAuthCallbackError,
  sanitizeOAuthErrorDetail,
} from "../../../lib/oauthCallbackErrors";
import {
  clearOAuthPkceCookie,
  createOAuthAuthClient,
} from "../../../lib/oauthAuthClient";
import {
  OAUTH_NEXT_COOKIE,
  OAUTH_REF_COOKIE,
  sanitizeNextPath,
} from "../../../lib/siteUrl";
import { applyReferralForNewUser, isLikelyNewUser } from "../../../lib/referrals";
import { REGISTER_NEXT_DEVICES } from "../../../lib/registerUrl";
import {
  hasMobileOAuthCookie,
  maybeRedirectMobileOAuth,
} from "../../../lib/mobileAuthRedirect";
import { setAuthCookies } from "../../../lib/auth";
import { setMfaRequiredCookie, needsMfaStepUp, getAssuranceLevels, createAuthClient } from "../../../lib/mfa";

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const oauthError = url.searchParams.get("error");
  const oauthErrorDescription = url.searchParams.get("error_description");
  const authCode = url.searchParams.get("code");

  if (oauthError) {
    clearOAuthPkceCookie(cookies);
    const detail = sanitizeOAuthErrorDetail(oauthErrorDescription);
    console.error(
      "OAuth provider callback error:",
      oauthError,
      detail ?? "(no description)",
    );
    const errorCode = mapOAuthCallbackError(oauthError, oauthErrorDescription);
    const showDetail =
      errorCode === "oauth_provider_failed" ? detail : null;
    return redirect(buildSignInRedirectUrl(errorCode, undefined, showDetail));
  }

  if (!authCode) {
    clearOAuthPkceCookie(cookies);
    return redirect(buildSignInRedirectUrl("generic"));
  }

  const authClient = createOAuthAuthClient(cookies);
  const { data, error } = await authClient.auth.exchangeCodeForSession(authCode);

  clearOAuthPkceCookie(cookies);

  if (error || !data.session) {
    const detail = sanitizeOAuthErrorDetail(error?.message);
    console.error("OAuth callback exchange failed:", detail ?? "no session");
    return redirect(buildSignInRedirectUrl("oauth_exchange_failed", undefined, detail));
  }

  const refCode = cookies.get(OAUTH_REF_COOKIE)?.value?.trim().toLowerCase() ?? "";
  cookies.delete(OAUTH_REF_COOKIE, { path: "/" });

  if (refCode && data.user && isLikelyNewUser(data.user.created_at)) {
    await applyReferralForNewUser(data.user.id, refCode, data.user.app_metadata);
  }

  const nextCookie = cookies.get(OAUTH_NEXT_COOKIE)?.value;
  cookies.delete(OAUTH_NEXT_COOKIE, { path: "/" });
  const defaultNext =
    data.user && isLikelyNewUser(data.user.created_at)
      ? REGISTER_NEXT_DEVICES
      : "/dashboard";
  const safeNext = sanitizeNextPath(nextCookie) ?? defaultNext;

  // Prefer returning to the Android app before any web MFA challenge. The app
  // runs YubiKey/TOTP itself. Chrome will not follow custom-scheme 302s after
  // Google security-key auth, so we hand off via HTTPS /app/oauth.
  if (hasMobileOAuthCookie(cookies)) {
    setAuthCookies(cookies, data.session.access_token, data.session.refresh_token);
    const stepClient = createAuthClient();
    await stepClient.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    const levels = await getAssuranceLevels(stepClient);
    setMfaRequiredCookie(cookies, needsMfaStepUp(levels));
    const mobileRedirect = await maybeRedirectMobileOAuth(
      cookies,
      data.session.access_token,
      data.session.refresh_token,
      url.origin,
    );
    if (mobileRedirect) return mobileRedirect;
  }

  const { redirectTo } = await applySessionCookiesAfterAuth(
    cookies,
    data.session,
    safeNext,
  );
  return redirect(redirectTo);
};
