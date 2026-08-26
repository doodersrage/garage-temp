import type { APIRoute } from "astro";
import { getAuthFromCookies, setAuthCookies } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard";
  const action = formData.get("action")?.toString() ?? "dismiss";

  const accessToken = cookies.get("sb-access-token")!.value;
  const refreshToken = cookies.get("sb-refresh-token")!.value;

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError) {
    return redirect(`${redirectTo}?onboarding_error=1`);
  }

  const existing = (user.user_metadata ?? {}) as Record<string, unknown>;
  const dismissed = action !== "reset";

  const { error } = await supabase.auth.updateUser({
    data: {
      ...existing,
      onboarding_dismissed: dismissed,
    },
  });

  if (error) {
    return redirect(`${redirectTo}?onboarding_error=1`);
  }

  const { data: refreshed } = await supabase.auth.refreshSession({
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
