import type { APIRoute } from "astro";
import { buildSignInRedirectUrl } from "../../../../lib/signInErrors";
import { applySessionCookiesAfterAuth } from "../../../../lib/mfa";
import {
  completeGitHubOAuth,
  establishSessionForGitHubProfile,
} from "../../../../lib/githubOAuth";
import { sanitizeOAuthErrorDetail } from "../../../../lib/oauthCallbackErrors";
import { applyReferralForNewUser, isLikelyNewUser } from "../../../../lib/referrals";
import { REGISTER_NEXT_DEVICES } from "../../../../lib/registerUrl";
import {
  buildGitHubOAuthCallbackUrl,
  GITHUB_OAUTH_STATE_COOKIE,
  OAUTH_NEXT_COOKIE,
  OAUTH_REF_COOKIE,
  sanitizeNextPath,
} from "../../../../lib/siteUrl";

export const GET: APIRoute = async ({ url, cookies, redirect, request, site }) => {
  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    cookies.delete(GITHUB_OAUTH_STATE_COOKIE, { path: "/" });
    const detail = sanitizeOAuthErrorDetail(url.searchParams.get("error_description"));
    console.error("GitHub OAuth provider error:", oauthError, detail ?? "(no description)");
    return redirect(buildSignInRedirectUrl("oauth_provider_failed", undefined, detail));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = cookies.get(GITHUB_OAUTH_STATE_COOKIE)?.value;
  cookies.delete(GITHUB_OAUTH_STATE_COOKIE, { path: "/" });

  if (!code || !state || !savedState || state !== savedState) {
    return redirect(buildSignInRedirectUrl("generic"));
  }

  try {
    const redirectUri = buildGitHubOAuthCallbackUrl(request, site);
    const profile = await completeGitHubOAuth(code, redirectUri);
    const { session, user } = await establishSessionForGitHubProfile(profile);

    const refCode = cookies.get(OAUTH_REF_COOKIE)?.value?.trim().toLowerCase() ?? "";
    cookies.delete(OAUTH_REF_COOKIE, { path: "/" });

    if (refCode && isLikelyNewUser(user.created_at)) {
      await applyReferralForNewUser(user.id, refCode, user.app_metadata);
    }

    const nextCookie = cookies.get(OAUTH_NEXT_COOKIE)?.value;
    cookies.delete(OAUTH_NEXT_COOKIE, { path: "/" });
    const defaultNext = isLikelyNewUser(user.created_at)
      ? REGISTER_NEXT_DEVICES
      : "/dashboard";
    const safeNext = sanitizeNextPath(nextCookie) ?? defaultNext;

    const { redirectTo } = await applySessionCookiesAfterAuth(cookies, session, safeNext);
    return redirect(redirectTo);
  } catch (error) {
    const detail = sanitizeOAuthErrorDetail(
      error instanceof Error ? error.message : String(error),
    );
    console.error("GitHub OAuth callback failed:", detail ?? "unknown error");
    return redirect(buildSignInRedirectUrl("oauth_github_profile", undefined, detail));
  }
};
