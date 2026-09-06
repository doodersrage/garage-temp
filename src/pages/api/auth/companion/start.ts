import type { APIRoute } from "astro";
import type { Provider } from "@supabase/supabase-js";
import { getAuthFromCookies } from "../../../../lib/auth";
import { buildSignInRedirectUrl } from "../../../../lib/signInErrors";
import { createOAuthAuthClient } from "../../../../lib/oauthAuthClient";
import {
  buildGitHubOAuthCallbackUrl,
  buildOAuthCallbackUrl,
  GITHUB_OAUTH_STATE_COOKIE,
  OAUTH_NEXT_COOKIE,
  OAUTH_REF_COOKIE,
} from "../../../../lib/siteUrl";
import {
  buildGitHubAuthorizeUrl,
  isGitHubOAuthConfigured,
} from "../../../../lib/githubOAuth";
import {
  redirectMobileOAuthComplete,
  setMobileOAuthCookie,
} from "../../../../lib/mobileAuthRedirect";
import {
  parseCompanionClient,
  setCompanionClientCookie,
  setCompanionLoopbackCookie,
} from "../../../../lib/companionAuth";

const VALID_PROVIDERS = ["google", "github", "discord"] as const;

function oauthProviderOptions(provider: string, redirectTo: string) {
  const options: { redirectTo: string; scopes?: string } = { redirectTo };
  if (provider === "github") {
    options.scopes = "read:user user:email";
  }
  return options;
}

/**
 * Start companion (Bay Buddy / Desktop / Android) sign-in.
 *
 * Query:
 * - `client=baybuddy|desktop|android` (default baybuddy)
 * - `loopback=http://127.0.0.1:PORT/oauth` (required for desktop return)
 * - `provider=google|github|discord` (optional; omit to use email sign-in page)
 */
export const GET: APIRoute = async ({ url, cookies, redirect, request, site }) => {
  const client = parseCompanionClient(url.searchParams.get("client"));
  const loopback = url.searchParams.get("loopback")?.trim() ?? "";
  const provider = url.searchParams.get("provider")?.trim().toLowerCase() ?? "";

  if (loopback && !setCompanionLoopbackCookie(cookies, loopback)) {
    return new Response(JSON.stringify({ error: "Invalid loopback URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  setCompanionClientCookie(cookies, client);
  setMobileOAuthCookie(cookies);
  cookies.delete(OAUTH_NEXT_COOKIE, { path: "/" });
  cookies.delete(OAUTH_REF_COOKIE, { path: "/" });

  // Already signed in in this browser — hand session back immediately.
  const { session } = await getAuthFromCookies(cookies);
  if (session?.access_token && session.refresh_token) {
    const handoff = await redirectMobileOAuthComplete(
      session.access_token,
      session.refresh_token,
      site,
    );
    if (handoff) return handoff;
  }

  const secure = import.meta.env.PROD;

  if (provider && VALID_PROVIDERS.includes(provider as (typeof VALID_PROVIDERS)[number])) {
    if (provider === "github" && isGitHubOAuthConfigured()) {
      const state = crypto.randomUUID();
      cookies.set(GITHUB_OAUTH_STATE_COOKIE, state, {
        path: "/",
        httpOnly: true,
        secure,
        sameSite: "lax",
        maxAge: 60 * 10,
      });
      const authorizeUrl = buildGitHubAuthorizeUrl(
        state,
        buildGitHubOAuthCallbackUrl(request, site),
      );
      if (!authorizeUrl) {
        return redirect(buildSignInRedirectUrl("oauth_failed"));
      }
      return redirect(authorizeUrl);
    }

    const oauthClient = createOAuthAuthClient(cookies);
    const { data, error } = await oauthClient.auth.signInWithOAuth({
      provider: provider as Provider,
      options: oauthProviderOptions(provider, buildOAuthCallbackUrl(request, site)),
    });
    if (error || !data.url) {
      return redirect(buildSignInRedirectUrl("oauth_failed"));
    }
    return redirect(data.url);
  }

  // Email / password (or pick a provider on the sign-in page).
  return redirect(
    `/signin?next=${encodeURIComponent("/api/auth/companion/complete")}`,
  );
};
