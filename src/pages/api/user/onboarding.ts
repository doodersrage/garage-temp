import type { APIRoute } from "astro";
import { getAuthFromCookies, setAuthCookies } from "../../../lib/auth";
import { createAuthClient } from "../../../lib/supabase";
import { formRedirectPath } from "../../../lib/siteUrl";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const redirectTo = formRedirectPath(formData, "/dashboard");
  const action = formData.get("action")?.toString() ?? "dismiss";

  const accessToken = cookies.get("sb-access-token")!.value;
  const refreshToken = cookies.get("sb-refresh-token")!.value;

  // One fresh client for this whole request, never the shared `supabase`
  // singleton. Cloudflare Workers can interleave concurrent requests
  // within one isolate's shared global scope, so a shared client's
  // session would be a race between unrelated users' requests -- and
  // below we take whatever session ends up on the client and hand it
  // back to the browser as auth cookies, so a shared client here could
  // actually issue one user's session cookies to a different user.
  const client = createAuthClient();

  const { error: sessionError } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError) {
    return redirect(`${redirectTo}?onboarding_error=1`);
  }

  const existing = (user.user_metadata ?? {}) as Record<string, unknown>;
  const dismissed = action !== "reset";

  const { error } = await client.auth.updateUser({
    data: {
      ...existing,
      onboarding_dismissed: dismissed,
    },
  });

  if (error) {
    return redirect(`${redirectTo}?onboarding_error=1`);
  }

  const { data: refreshed } = await client.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (refreshed.session) {
    setAuthCookies(
      cookies,
      refreshed.session.access_token,
      refreshed.session.refresh_token,
    );
  }

  return redirect(
    `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}${
      dismissed ? "onboarding_dismissed=1" : "onboarding_reset=1"
    }`,
  );
};
