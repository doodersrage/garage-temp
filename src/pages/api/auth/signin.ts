import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import type { Provider } from "@supabase/supabase-js";
import {
  buildSignInRedirectUrl,
  mapSignInError,
} from "../../../lib/signInErrors";
import { applySessionCookiesAfterAuth, createAuthClient } from "../../../lib/mfa";
import {
  buildOAuthCallbackUrl,
  OAUTH_NEXT_COOKIE,
  OAUTH_REF_COOKIE,
  sanitizeNextPath,
} from "../../../lib/siteUrl";
import { getTurnstileToken, verifyTurnstileToken } from "../../../lib/turnstile";

export const POST: APIRoute = async ({ request, cookies, redirect, clientAddress, site }) => {
  const formData = await request.formData();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const provider = formData.get("provider")?.toString();
  const safeNext = sanitizeNextPath(formData.get("next")?.toString());

  const refCode = formData.get("ref")?.toString()?.trim().toLowerCase() ?? "";

  const validProviders = ["google", "github", "discord"];

  // OAuth only when a provider is set and this is not an email/password submit
  // (nested OAuth fields used to leak into the email form in some browsers).
  if (provider && validProviders.includes(provider) && !password) {
    const secure = import.meta.env.PROD;
    if (safeNext) {
      cookies.set(OAUTH_NEXT_COOKIE, safeNext, {
        path: "/",
        httpOnly: true,
        secure,
        sameSite: "lax",
        maxAge: 60 * 10,
      });
    } else {
      cookies.delete(OAUTH_NEXT_COOKIE, { path: "/" });
    }

    if (refCode) {
      cookies.set(OAUTH_REF_COOKIE, refCode, {
        path: "/",
        httpOnly: true,
        secure,
        sameSite: "lax",
        maxAge: 60 * 10,
      });
    } else {
      cookies.delete(OAUTH_REF_COOKIE, { path: "/" });
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as Provider,
      options: {
        redirectTo: buildOAuthCallbackUrl(request, site),
      },
    });

    if (error) {
      return redirect(buildSignInRedirectUrl("oauth_failed"));
    }

    return redirect(data.url);
  }

  const turnstile = await verifyTurnstileToken(
    getTurnstileToken(formData),
    clientAddress,
  );

  if (!turnstile.success) {
    return redirect(buildSignInRedirectUrl("turnstile_failed", email));
  }

  if (!email || !password) {
    return redirect(buildSignInRedirectUrl("missing_fields", email));
  }

  const authClient = createAuthClient();
  const { data, error } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return redirect(buildSignInRedirectUrl(mapSignInError(error ?? { message: "generic" }), email));
  }

  const { redirectTo } = await applySessionCookiesAfterAuth(
    cookies,
    data.session,
    safeNext,
  );
  return redirect(redirectTo);
};
