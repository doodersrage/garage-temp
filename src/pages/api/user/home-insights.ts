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
import { fetchGarageTempChartData } from "../../../lib/garageTempsHistory";
import { fetchLatestSensorValues } from "../../../lib/sensorReadings";
import { getUserHouseholdId } from "../../../lib/households";
import {
  buildTimeToFreezeProjection,
  outdoorPointsFromHourly,
  timeToFreezeApiPayload,
} from "../../../lib/spaceThermalModel";
import {
  fetchOpenMeteoHourlyWindow,
  splitOpenMeteoPastAndForecast,
} from "../../../lib/openMeteoHistory";

export const GET: APIRoute = async ({ cookies }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [preferences, alertSettings, householdId] = await Promise.all([
    getUserPreferences(user),
    getAlertSettingsForUser(user.id, user.user_metadata as Record<string, unknown>),
    getUserHouseholdId(user.id),
  ]);

  const weatherConfig = getPersonalWeatherConfig(user);
  const [nightsAtRisk, weatherSnapshot, house, regionalBenchmark, chartWeek, latest] =
    await Promise.all([
      fetchNightsAtRiskForConfig(weatherConfig, alertSettings.freezeThresholdF),
      fetchWeatherSnapshotForConfig(weatherConfig),
      fetchMobileHousePayloadForUser(user.id),
      fetchMobileRegionalBenchmarkForUser(user.id),
      fetchGarageTempChartData(user.id, 7),
      householdId ? fetchLatestSensorValues(householdId) : Promise.resolve([]),
    ]);

  let nwsAlerts: Awaited<ReturnType<typeof fetchNwsAlerts>> | null = null;
  let outdoorHourly: Awaited<ReturnType<typeof fetchOpenMeteoHourlyWindow>> = [];
  if (weatherSnapshot?.lat != null && weatherSnapshot?.lon != null) {
    const [nws, hourly] = await Promise.all([
      fetchNwsAlerts(weatherSnapshot.lat, weatherSnapshot.lon),
      fetchOpenMeteoHourlyWindow(weatherSnapshot.lat, weatherSnapshot.lon).catch(() => []),
    ]);
    nwsAlerts = nws;
    outdoorHourly = hourly;
  }

  const outdoorSplit = splitOpenMeteoPastAndForecast(outdoorHourly);
  const temps = latest
    .filter((row) => row.sensor.kind === "temperature" && row.value_num != null)
    .map((row) => row.value_num as number);
  const currentTempF =
    temps.length > 0
      ? Math.min(...temps)
      : chartWeek.points.filter((p) => Number.isFinite(p.tempf)).at(-1)?.tempf;
  const doorOpenNearby = latest.some(
    (row) =>
      row.sensor.kind === "door" &&
      (row.value_bool === true || row.value_text === "open"),
  );
  const timeToFreeze =
    currentTempF != null
      ? timeToFreezeApiPayload(
          buildTimeToFreezeProjection({
            currentTempF,
            freezeThresholdF: alertSettings.freezeThresholdF,
            indoorSamples: chartWeek.points
              .filter((p) => Number.isFinite(p.tempf))
              .map((p) => ({ at: p.timestamp, tempF: p.tempf })),
            outdoorPast: outdoorPointsFromHourly(outdoorSplit.past),
            outdoorForecast: outdoorPointsFromHourly(outdoorSplit.forecast),
            doorOpenNearby,
            timeZone: alertSettings.quietHoursTimezone,
            lookAheadHours: alertSettings.forecastHoursAhead,
            useCelsius: preferences.useCelsius,
          }),
        )
      : null;

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
      time_to_freeze: timeToFreeze,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "private, max-age=120" },
    },
  );
};
