import type { APIRoute } from "astro";
import { createAuthClient } from "../../../lib/supabase";
import {
  getAuthFromRequest,
  setAuthCookies,
} from "../../../lib/auth";
import {
  updateUserDisplayPreferences,
  parseDisplayPreferencesInput,
} from "../../../lib/userPreferences";
import { formRedirectPath } from "../../../lib/siteUrl";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromRequest(request, cookies);

  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const redirectTo = formRedirectPath(formData, "/dashboard");
  const prefs = parseDisplayPreferencesInput({
    show_garage_temps: formData.has("show_garage_temps") ? "on" : "",
    show_weather: formData.has("show_weather") ? "on" : "",
    use_celsius: formData.has("use_celsius") ? "on" : "",
    weather_city_id: formData.get("weather_city_id")?.toString(),
    weather_source: formData.get("weather_source")?.toString(),
    ambient_weather_mac: formData.get("ambient_weather_mac")?.toString(),
    ambient_weather_api_key: formData.get("ambient_weather_api_key")?.toString(),
    weatherflow_station_id: formData.get("weatherflow_station_id")?.toString(),
    weatherflow_token: formData.get("weatherflow_token")?.toString(),
    theme: formData.get("theme")?.toString(),
  });

  const accessToken = cookies.get("sb-access-token")!.value;
  const refreshToken = cookies.get("sb-refresh-token")!.value;

  const { error } = await updateUserDisplayPreferences(
    accessToken,
    refreshToken,
    prefs,
  );

  if (error) {
    return redirect(`${redirectTo}?prefs_error=1`);
  }

  cookies.set("theme", prefs.theme, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  // Fresh client -- never the shared `supabase` singleton, whose ambient
  // session is effectively shared mutable state across concurrent
  // requests under Cloudflare Workers, and whose refreshSession() result
  // here gets turned straight into this response's auth cookies.
  const { data: refreshedSession } = await createAuthClient().auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (refreshedSession.session) {
    setAuthCookies(
      cookies,
      refreshedSession.session.access_token,
      refreshedSession.session.refresh_token,
    );
  }

  return redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}prefs_saved=1`);
};
