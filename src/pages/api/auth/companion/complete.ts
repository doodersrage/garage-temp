import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../../lib/auth";
import {
  hasMobileOAuthCookie,
  maybeRedirectMobileOAuth,
  setMobileOAuthCookie,
} from "../../../../lib/mobileAuthRedirect";

/**
 * After email/password (or OAuth next=) sign-in, finish companion handoff.
 * Requires companion/start to have set the mobile_oauth (+ optional loopback) cookies.
 */
export const GET: APIRoute = async ({ cookies, redirect, site }) => {
  const { session } = await getAuthFromCookies(cookies);
  if (!session?.access_token || !session.refresh_token) {
    return redirect(
      `/signin?next=${encodeURIComponent("/api/auth/companion/complete")}`,
    );
  }

  if (!hasMobileOAuthCookie(cookies)) {
    setMobileOAuthCookie(cookies);
  }

  const handoff = await maybeRedirectMobileOAuth(
    cookies,
    session.access_token,
    session.refresh_token,
    site,
  );
  if (handoff) return handoff;

  return redirect("/dashboard");
};
