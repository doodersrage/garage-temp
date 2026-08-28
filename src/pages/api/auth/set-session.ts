import type { APIRoute } from "astro";
import { getAuthFromCookies, setAuthCookies } from "../../../lib/auth";
import {
  createAuthClient,
  getAalClaim,
  syncMfaRequiredCookieFromClient,
} from "../../../lib/mfa";

/**
 * Persist a client-upgraded session (e.g. legacy MFA flows) into HttpOnly cookies.
 * Tokens must belong to the same user already signed in via cookies.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const { session: existing, user } = await getAuthFromCookies(cookies);
  if (!existing || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { access_token?: string; refresh_token?: string };
  try {
    body = (await request.json()) as { access_token?: string; refresh_token?: string };
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const accessToken = body.access_token?.trim();
  const refreshToken = body.refresh_token?.trim();
  if (!accessToken || !refreshToken) {
    return new Response(JSON.stringify({ error: "Missing tokens" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = createAuthClient();
  const { data, error } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error || !data.session || !data.user || data.user.id !== user.id) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  setAuthCookies(cookies, data.session.access_token, data.session.refresh_token);
  await syncMfaRequiredCookieFromClient(
    cookies,
    client,
    data.session.access_token,
  );

  return new Response(JSON.stringify({ ok: true, aal: getAalClaim(data.session.access_token) }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
