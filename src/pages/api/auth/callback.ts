import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import { buildSignInRedirectUrl } from "../../../lib/signInErrors";
import { setAuthCookies } from "../../../lib/auth";
import { OAUTH_NEXT_COOKIE, sanitizeNextPath } from "../../../lib/siteUrl";

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

  const nextCookie = cookies.get(OAUTH_NEXT_COOKIE)?.value;
  cookies.delete(OAUTH_NEXT_COOKIE, { path: "/" });
  const safeNext = sanitizeNextPath(nextCookie) ?? "/dashboard";

  return redirect(safeNext);
};
