import type { APIRoute } from "astro";
import type { Provider } from "@supabase/supabase-js";
import { buildSignInRedirectUrl } from "../../../lib/signInErrors";
import { createOAuthAuthClient } from "../../../lib/oauthAuthClient";
import {
  buildGitHubOAuthCallbackUrl,
  buildOAuthCallbackUrl,
  GITHUB_OAUTH_STATE_COOKIE,
  OAUTH_NEXT_COOKIE,
  OAUTH_REF_COOKIE,
} from "../../../lib/siteUrl";
import {
  buildGitHubAuthorizeUrl,
  isGitHubOAuthConfigured,
} from "../../../lib/githubOAuth";
import { setMobileOAuthCookie } from "../../../lib/mobileAuthRedirect";

const VALID = ["google", "github", "discord"] as const;

function oauthProviderOptions(provider: string, redirectTo: string) {
  const options: { redirectTo: string; scopes?: string } = { redirectTo };
  if (provider === "github") {
    options.scopes = "read:user user:email";
  }
  return options;
}

/** Start OAuth in a mobile browser tab; callback returns to the native app. */
export const GET: APIRoute = async ({ url, cookies, redirect, request, site }) => {
  const provider = url.searchParams.get("provider")?.trim().toLowerCase() ?? "";
  if (!VALID.includes(provider as (typeof VALID)[number])) {
    return redirect(buildSignInRedirectUrl("oauth_failed"));
  }

  setMobileOAuthCookie(cookies);
  cookies.delete(OAUTH_NEXT_COOKIE, { path: "/" });
  cookies.delete(OAUTH_REF_COOKIE, { path: "/" });

  const secure = import.meta.env.PROD;

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
};
