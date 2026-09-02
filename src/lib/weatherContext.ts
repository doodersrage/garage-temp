import type { User } from "@supabase/supabase-js";
import {
  fetchForecastMinTemp,
  fetchForecastMinTempByCoords,
  fetchNightsAtRisk,
  fetchWeatherSnapshot,
  resolveWeatherCityId,
  type ForecastWindow,
  type NightRisk,
  type WeatherSnapshot,
} from "./FetchWeather";
import {
  fetchAmbientWeatherSnapshot,
  fetchWeatherFlowSnapshot,
  type PersonalWeatherConfig,
} from "./personalWeatherStations";
import {
  personalWeatherConfigFromPreferences,
  getDisplayPreferencesFromMetadata,
} from "./userPreferences";

export type { PersonalWeatherConfig };

export function getPersonalWeatherConfig(
  user: User | null | undefined,
): PersonalWeatherConfig {
  const display = getDisplayPreferencesFromMetadata(user);
  return personalWeatherConfigFromPreferences(display);
}

export async function fetchWeatherSnapshotForConfig(
  config: PersonalWeatherConfig,
): Promise<WeatherSnapshot | null> {
  if (config.source === "ambient" && config.ambientMac && config.ambientApiKey) {
    const snapshot = await fetchAmbientWeatherSnapshot(
      config.ambientMac,
      config.ambientApiKey,
    );
    if (snapshot) return snapshot;
  }

  if (
    config.source === "weatherflow" &&
    config.weatherflowStationId &&
    config.weatherflowToken
  ) {
    const snapshot = await fetchWeatherFlowSnapshot(
      config.weatherflowStationId,
      config.weatherflowToken,
    );
    if (snapshot) return snapshot;
  }

  const cityId = resolveWeatherCityId(config.openWeatherCityId);
  const snapshot = await fetchWeatherSnapshot(cityId);
  if (snapshot) {
    return { ...snapshot, source: "openweather" };
  }
  return null;
}

export async function fetchWeatherForUser(
  user: User | null | undefined,
): Promise<WeatherSnapshot | null> {
  return fetchWeatherSnapshotForConfig(getPersonalWeatherConfig(user));
}

export async function fetchForecastMinTempForConfig(
  config: PersonalWeatherConfig,
  hoursAhead = 24,
): Promise<ForecastWindow | null> {
  const snapshot = await fetchWeatherSnapshotForConfig(config);
  if (snapshot?.lat != null && snapshot.lon != null) {
    const byCoords = await fetchForecastMinTempByCoords(
      snapshot.lat,
      snapshot.lon,
      hoursAhead,
    );
    if (byCoords) return byCoords;
  }

  return fetchForecastMinTemp(resolveWeatherCityId(config.openWeatherCityId), hoursAhead);
}

export async function fetchNightsAtRiskForConfig(
  config: PersonalWeatherConfig,
  freezeThresholdF: number,
  /** Pass an already-fetched snapshot to avoid a duplicate weather API call. */
  existingSnapshot?: WeatherSnapshot | null,
): Promise<NightRisk[]> {
  const snapshot =
    existingSnapshot !== undefined
      ? existingSnapshot
      : await fetchWeatherSnapshotForConfig(config);
  if (snapshot?.lat != null && snapshot.lon != null) {
    return fetchNightsAtRisk({
      lat: snapshot.lat,
      lon: snapshot.lon,
      freezeThresholdF,
    });
  }

  return fetchNightsAtRisk({
    cityId: resolveWeatherCityId(config.openWeatherCityId),
    freezeThresholdF,
  });
}
