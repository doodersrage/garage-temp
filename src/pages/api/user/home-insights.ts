import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { fetchNwsAlerts } from "../../../lib/nwsAlerts";
import { getAlertSettingsForUser } from "../../../lib/notify";
import {
  fetchNightsAtRiskForConfig,
  fetchWeatherSnapshotForConfig,
  getPersonalWeatherConfig,
} from "../../../lib/weatherContext";
import { getUserPreferences } from "../../../lib/userPreferences";
import {
  fetchMobileHousePayloadForUser,
  fetchMobileRegionalBenchmarkForUser,
} from "../../../lib/mobileHouseContext";

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

  const weatherConfig = getPersonalWeatherConfig(user);
  const [nightsAtRisk, weatherSnapshot, house, regionalBenchmark] = await Promise.all([
    fetchNightsAtRiskForConfig(weatherConfig, alertSettings.freezeThresholdF),
    fetchWeatherSnapshotForConfig(weatherConfig),
    fetchMobileHousePayloadForUser(user.id),
    fetchMobileRegionalBenchmarkForUser(user.id),
  ]);

  let nwsAlerts: Awaited<ReturnType<typeof fetchNwsAlerts>> | null = null;
  if (weatherSnapshot?.lat != null && weatherSnapshot?.lon != null) {
    nwsAlerts = await fetchNwsAlerts(weatherSnapshot.lat, weatherSnapshot.lon);
  }

  return new Response(
    JSON.stringify({
      freeze_threshold_f: alertSettings.freezeThresholdF,
      weather_source: weatherSnapshot?.source ?? preferences.weatherSource,
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
      })),
      outdoor_temp_f: weatherSnapshot?.temp ?? null,
      house,
      regional_benchmark: regionalBenchmark,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "private, max-age=120" },
    },
  );
};
