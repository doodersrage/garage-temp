import type { APIRoute } from "astro";
import { buildSignInRedirectUrl } from "../../../lib/signInErrors";
import { applySessionCookiesAfterAuth, createAuthClient } from "../../../lib/mfa";
import {
  OAUTH_NEXT_COOKIE,
  OAUTH_REF_COOKIE,
  sanitizeNextPath,
} from "../../../lib/siteUrl";
import { applyReferralForNewUser, isLikelyNewUser } from "../../../lib/referrals";

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const authCode = url.searchParams.get("code");

  if (!authCode) {
    return redirect(buildSignInRedirectUrl("generic"));
  }

  const authClient = createAuthClient();
  const { data, error } = await authClient.auth.exchangeCodeForSession(authCode);

  if (error || !data.session) {
    return redirect(buildSignInRedirectUrl("generic"));
  }

  const refCode = cookies.get(OAUTH_REF_COOKIE)?.value?.trim().toLowerCase() ?? "";
  cookies.delete(OAUTH_REF_COOKIE, { path: "/" });

  if (refCode && data.user && isLikelyNewUser(data.user.created_at)) {
    await applyReferralForNewUser(data.user.id, refCode, data.user.app_metadata);
  }

  const nextCookie = cookies.get(OAUTH_NEXT_COOKIE)?.value;
  cookies.delete(OAUTH_NEXT_COOKIE, { path: "/" });
  const safeNext = sanitizeNextPath(nextCookie) ?? "/dashboard";

  const { redirectTo } = await applySessionCookiesAfterAuth(
    cookies,
    data.session,
    safeNext,
  );
  return redirect(redirectTo);
};
