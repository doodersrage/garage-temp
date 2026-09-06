import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../../lib/auth";
import {
  hasMobileOAuthCookie,
  maybeRedirectMobileOAuth,
} from "../../../../lib/mobileAuthRedirect";
import { buildMfaChallengeUrl, sessionNeedsMfaStepUp } from "../../../../lib/mfa";
import { hasValidMfaStepUpProof } from "../../../../lib/mfaStepUpProof";

/**
 * After email/password (or OAuth next=) sign-in, finish companion handoff.
 * Requires companion/start to have set the mobile_oauth (+ optional loopback) cookies.
 */
export const GET: APIRoute = async ({ cookies, redirect, request, site }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session?.access_token || !session.refresh_token) {
    return redirect(
      `/signin?next=${encodeURIComponent("/api/auth/companion/complete")}`,
    );
  }

  if (!hasMobileOAuthCookie(cookies)) {
    return redirect("/apps?error=companion_session");
  }

  const needsMfa = await sessionNeedsMfaStepUp(
    session.access_token,
    session.refresh_token,
    user,
  );
  if (needsMfa) {
    const hasProof =
      !!user?.id &&
      (await hasValidMfaStepUpProof(request, cookies, user.id));
    if (!hasProof) {
      return redirect(buildMfaChallengeUrl("/api/auth/companion/complete"));
    }
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
