import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import {
  getAuthFromCookies,
  setAuthCookies,
} from "../../../lib/auth";
import { updateUserDisplayPreferences } from "../../../lib/userPreferences";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard";
  const weatherCityIdRaw = formData.get("weather_city_id")?.toString().trim() ?? "";
  const weatherCityId = /^\d+$/.test(weatherCityIdRaw) ? weatherCityIdRaw : null;

  const accessToken = cookies.get("sb-access-token")!.value;
  const refreshToken = cookies.get("sb-refresh-token")!.value;

  const { error } = await updateUserDisplayPreferences(
    accessToken,
    refreshToken,
    {
      showGarageTemps: formData.has("show_garage_temps"),
      showWeather: formData.has("show_weather"),
      weatherCityId,
    },
  );

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const { data: refreshedSession } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (refreshedSession.session) {
    setAuthCookies(
      cookies,
      refreshedSession.session.access_token,
      refreshedSession.session.refresh_token,
    );
  }

  return redirect(redirectTo);
};
