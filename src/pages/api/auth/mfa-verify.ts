import type { APIRoute } from "astro";
import { getAuthFromCookies, setAuthCookies } from "../../../lib/auth";
import {
  createAuthClient,
  getAssuranceLevels,
  needsMfaStepUp,
  setMfaRequiredCookie,
} from "../../../lib/mfa";
import { sanitizeNextPath } from "../../../lib/siteUrl";

function buildMfaErrorRedirect(code: string, next?: string | null): string {
  const params = new URLSearchParams({ error: code });
  const safeNext = sanitizeNextPath(next ?? undefined);
  if (safeNext) params.set("next", safeNext);
  return `/signin/mfa?${params.toString()}`;
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session } = await getAuthFromCookies(cookies);
  if (!session) {
    return redirect("/signin?error=generic");
  }

  const formData = await request.formData();
  const code = formData.get("code")?.toString().trim() ?? "";
  const next = formData.get("next")?.toString();
  const safeNext = sanitizeNextPath(next) ?? "/dashboard";

  if (!/^\d{6}$/.test(code)) {
    return redirect(buildMfaErrorRedirect("invalid_code", safeNext));
  }

  const client = createAuthClient();
  const { error: sessionError } = await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (sessionError) {
    return redirect("/signin?error=generic");
  }

  const levels = await getAssuranceLevels(client);
  if (!needsMfaStepUp(levels)) {
    setMfaRequiredCookie(cookies, false);
    return redirect(safeNext);
  }

  const { data: factors, error: factorsError } = await client.auth.mfa.listFactors();
  if (factorsError) {
    return redirect(buildMfaErrorRedirect("generic", safeNext));
  }

  const factor =
    factors.totp.find((item) => item.status === "verified") ??
    factors.totp[0] ??
    null;

  if (!factor) {
    return redirect(buildMfaErrorRedirect("no_factor", safeNext));
  }

  const { data, error } = await client.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code,
  });

  if (error || !data?.access_token || !data.refresh_token) {
    return redirect(buildMfaErrorRedirect("invalid_code", safeNext));
  }

  setAuthCookies(cookies, data.access_token, data.refresh_token);
  setMfaRequiredCookie(cookies, false);
  return redirect(safeNext);
};
