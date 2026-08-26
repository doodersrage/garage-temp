import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import { buildSignInRedirectUrl } from "../../../lib/signInErrors";
import { setAuthCookies } from "../../../lib/auth";
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

  const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);

  if (error) {
    return redirect(buildSignInRedirectUrl("generic"));
  }

  const { access_token, refresh_token } = data.session;
  setAuthCookies(cookies, access_token, refresh_token);

  const refCode = cookies.get(OAUTH_REF_COOKIE)?.value?.trim().toLowerCase() ?? "";
  cookies.delete(OAUTH_REF_COOKIE, { path: "/" });

  if (refCode && data.user && isLikelyNewUser(data.user.created_at)) {
    await applyReferralForNewUser(data.user.id, refCode, data.user.user_metadata);
  }

  const nextCookie = cookies.get(OAUTH_NEXT_COOKIE)?.value;
  cookies.delete(OAUTH_NEXT_COOKIE, { path: "/" });
  const safeNext = sanitizeNextPath(nextCookie) ?? "/dashboard";

  return redirect(safeNext);
};
