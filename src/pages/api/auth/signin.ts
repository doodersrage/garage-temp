import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import type { Provider } from "@supabase/supabase-js";
import { setAuthCookies } from "../../../lib/auth";
import {
  buildSignInRedirectUrl,
  mapSignInError,
} from "../../../lib/signInErrors";
import {
  buildOAuthCallbackUrl,
  OAUTH_NEXT_COOKIE,
  sanitizeNextPath,
} from "../../../lib/siteUrl";
import { getTurnstileToken, verifyTurnstileToken } from "../../../lib/turnstile";

export const POST: APIRoute = async ({ request, cookies, redirect, clientAddress, site }) => {
  const formData = await request.formData();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const provider = formData.get("provider")?.toString();
  const safeNext = sanitizeNextPath(formData.get("next")?.toString());

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
    return redirect(buildSignInRedirectUrl("generic", email));
  }

  if (!email || !password) {
    return redirect(buildSignInRedirectUrl("missing_fields", email));
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return redirect(buildSignInRedirectUrl(mapSignInError(error), email));
  }

  const { access_token, refresh_token } = data.session;
  setAuthCookies(cookies, access_token, refresh_token);
  return redirect(safeNext ?? "/dashboard");
};
