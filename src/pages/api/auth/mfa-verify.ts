import type { APIRoute } from "astro";
import { getAuthFromCookies, setAuthCookies } from "../../../lib/auth";
import {
  createAuthClient,
  getAssuranceLevels,
  needsMfaStepUp,
  setMfaRequiredCookie,
} from "../../../lib/mfa";
import { sanitizeNextPath } from "../../../lib/siteUrl";
import {
  checkMfaVerifyRateLimit,
  clearMfaVerifyFailures,
  recordMfaVerifyFailure,
} from "../../../lib/mfaVerifyLimits";

function buildMfaErrorRedirect(code: string, next?: string | null): string {
  const params = new URLSearchParams({ error: code });
  const safeNext = sanitizeNextPath(next ?? undefined);
  if (safeNext) params.set("next", safeNext);
  return `/signin/mfa?${params.toString()}`;
}

function wantsJson(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  return accept.includes("application/json") || contentType.includes("application/json");
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  const asJson = wantsJson(request);

  if (!session || !user) {
    if (asJson) return jsonResponse({ error: "Unauthorized" }, 401);
    return redirect("/signin?error=generic");
  }

  let code = "";
  let next: string | undefined;

  if (asJson) {
    let body: { code?: string; next?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }
    code = body.code?.trim() ?? "";
    next = body.next;
  } else {
    const formData = await request.formData();
    code = formData.get("code")?.toString().trim() ?? "";
    next = formData.get("next")?.toString();
  }

  const safeNext = sanitizeNextPath(next) ?? "/dashboard";

  const rateLimit = checkMfaVerifyRateLimit(user.id);
  if (!rateLimit.ok) {
    if (asJson) return jsonResponse({ error: "rate_limited" }, 429);
    return redirect(buildMfaErrorRedirect("rate_limited", safeNext));
  }

  if (!/^\d{6}$/.test(code)) {
    recordMfaVerifyFailure(user.id);
    if (asJson) return jsonResponse({ error: "invalid_code" }, 400);
    return redirect(buildMfaErrorRedirect("invalid_code", safeNext));
  }

  const client = createAuthClient();
  const { error: sessionError } = await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (sessionError) {
    if (asJson) return jsonResponse({ error: "generic" }, 400);
    return redirect("/signin?error=generic");
  }

  const levels = await getAssuranceLevels(client);
  if (!needsMfaStepUp(levels)) {
    setMfaRequiredCookie(cookies, false);
    if (asJson) {
      return jsonResponse({
        ok: true,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        aal: "aal2",
      });
    }
    return redirect(safeNext);
  }

  const { data: factors, error: factorsError } = await client.auth.mfa.listFactors();
  if (factorsError) {
    if (asJson) return jsonResponse({ error: "generic" }, 400);
    return redirect(buildMfaErrorRedirect("generic", safeNext));
  }

  const factor =
    factors.totp.find((item) => item.status === "verified") ??
    factors.totp[0] ??
    null;

  if (!factor) {
    if (asJson) return jsonResponse({ error: "no_factor" }, 400);
    return redirect(buildMfaErrorRedirect("no_factor", safeNext));
  }

  const { data, error } = await client.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code,
  });

  if (error || !data?.access_token || !data.refresh_token) {
    recordMfaVerifyFailure(user.id);
    if (asJson) return jsonResponse({ error: "invalid_code" }, 400);
    return redirect(buildMfaErrorRedirect("invalid_code", safeNext));
  }

  clearMfaVerifyFailures(user.id);
  setAuthCookies(cookies, data.access_token, data.refresh_token);
  setMfaRequiredCookie(cookies, false);
  if (asJson) {
    return jsonResponse({
      ok: true,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      aal: "aal2",
    });
  }
  return redirect(safeNext);
};
