import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import type { Provider } from "@supabase/supabase-js";
import {
  buildSignInRedirectUrl,
  mapSignInError,
} from "../../../lib/signInErrors";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const provider = formData.get("provider")?.toString();

  const validProviders = ["google", "github", "discord"];

  if (provider && validProviders.includes(provider)) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as Provider,
      options: {
        redirectTo: "http://localhost:4321/api/auth/callback",
      },
    });

    if (error) {
      return redirect(buildSignInRedirectUrl("oauth_failed"));
    }

    return redirect(data.url);
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
  cookies.set("sb-access-token", access_token, {
    path: "/",
  });
  cookies.set("sb-refresh-token", refresh_token, {
    path: "/",
  });
  return redirect("/dashboard");
};
