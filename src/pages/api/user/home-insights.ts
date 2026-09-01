import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { fetchNightsAtRisk, fetchWeatherSnapshot } from "../../../lib/FetchWeather";
import { fetchNwsAlerts } from "../../../lib/nwsAlerts";
import { getAlertSettingsForUser } from "../../../lib/notify";
import { getUserPreferences } from "../../../lib/userPreferences";

export const GET: APIRoute = async ({ cookies }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [preferences, alertSettings] = await Promise.all([
    getUserPreferences(user),
    getAlertSettingsForUser(user.id, user.user_metadata as Record<string, unknown>),
  ]);

  const cityId = preferences.weatherCityId;
  const [nightsAtRisk, weatherSnapshot] = await Promise.all([
    fetchNightsAtRisk({
      cityId,
      freezeThresholdF: alertSettings.freezeThresholdF,
    }),
    fetchWeatherSnapshot(cityId),
  ]);

  let nwsAlerts: Awaited<ReturnType<typeof fetchNwsAlerts>> | null = null;
  if (weatherSnapshot?.lat != null && weatherSnapshot?.lon != null) {
    nwsAlerts = await fetchNwsAlerts(weatherSnapshot.lat, weatherSnapshot.lon);
  }

  return new Response(
    JSON.stringify({
      freeze_threshold_f: alertSettings.freezeThresholdF,
      nights_at_risk: nightsAtRisk.map((night) => ({
        date_label: night.dateLabel,
        min_temp_f: night.minTempF,
        at_risk: night.atRisk,
      })),
      nws_alerts: nwsAlerts?.alerts?.map((alert) => ({
        event: alert.event,
        headline: alert.headline,
        severity: alert.severity,
        expires: alert.expires,
      })) ?? [],
      weather: weatherSnapshot
        ? {
            name: weatherSnapshot.name,
            temp_f: weatherSnapshot.temp,
            description: weatherSnapshot.description,
          }
        : null,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    },
  );
};
