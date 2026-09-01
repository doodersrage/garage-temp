import type { User } from "@supabase/supabase-js";
import { createAuthClient } from "./supabase";
import type { TempFeedConfig, TempProbeConfig } from "./tempFeedConfig";
import {
  getDefaultTempFeeds,
  getDefaultTempProbes,
} from "./tempFeedConfig";
import { getUserTempConfig } from "./userTempConfig";
import {
  normalizeAmbientMac,
  normalizeWeatherflowStationId,
  personalWeatherConfigFromMetadata,
  personalWeatherMetadataPatch,
  type PersonalWeatherConfig,
  type WeatherSource,
} from "./personalWeatherStations";

export type ThemePreference = "dark" | "light" | "system";

export type UserPreferences = {
  showGarageTemps: boolean;
  showWeather: boolean;
  weatherCityId: string | null;
  weatherSource: WeatherSource;
  ambientWeatherMac: string | null;
  ambientWeatherApiKey: string | null;
  weatherflowStationId: string | null;
  weatherflowToken: string | null;
  useCelsius: boolean;
  theme: ThemePreference;
  tempFeeds: TempFeedConfig[];
  tempProbes: TempProbeConfig[];
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  showGarageTemps: true,
  showWeather: true,
  weatherCityId: null,
  weatherSource: "openweather",
  ambientWeatherMac: null,
  ambientWeatherApiKey: null,
  weatherflowStationId: null,
  weatherflowToken: null,
  useCelsius: false,
  theme: "dark",
  tempFeeds: getDefaultTempFeeds(),
  tempProbes: getDefaultTempProbes(),
};

export function getDisplayPreferencesFromMetadata(
  user: User | null | undefined,
): Pick<
  UserPreferences,
  | "showGarageTemps"
  | "showWeather"
  | "weatherCityId"
  | "weatherSource"
  | "ambientWeatherMac"
  | "ambientWeatherApiKey"
  | "weatherflowStationId"
  | "weatherflowToken"
  | "useCelsius"
  | "theme"
> {
  if (!user?.user_metadata) {
    return {
      showGarageTemps: DEFAULT_USER_PREFERENCES.showGarageTemps,
      showWeather: DEFAULT_USER_PREFERENCES.showWeather,
      weatherCityId: DEFAULT_USER_PREFERENCES.weatherCityId,
      weatherSource: DEFAULT_USER_PREFERENCES.weatherSource,
      ambientWeatherMac: DEFAULT_USER_PREFERENCES.ambientWeatherMac,
      ambientWeatherApiKey: DEFAULT_USER_PREFERENCES.ambientWeatherApiKey,
      weatherflowStationId: DEFAULT_USER_PREFERENCES.weatherflowStationId,
      weatherflowToken: DEFAULT_USER_PREFERENCES.weatherflowToken,
      useCelsius: DEFAULT_USER_PREFERENCES.useCelsius,
      theme: DEFAULT_USER_PREFERENCES.theme,
    };
  }

  const metadata = user.user_metadata;
  const themeRaw = metadata.theme;
  const theme: ThemePreference =
    themeRaw === "light" || themeRaw === "system" ? themeRaw : "dark";

  const weatherCityId =
    typeof metadata.weather_city_id === "string" &&
    /^\d+$/.test(metadata.weather_city_id.trim())
      ? metadata.weather_city_id.trim()
      : null;

  const personal = personalWeatherConfigFromMetadata(metadata, weatherCityId);

  return {
    showGarageTemps: metadata.show_garage_temps !== false,
    showWeather: metadata.show_weather !== false,
    weatherCityId,
    weatherSource: personal.source,
    ambientWeatherMac: personal.ambientMac,
    ambientWeatherApiKey: personal.ambientApiKey,
    weatherflowStationId: personal.weatherflowStationId,
    weatherflowToken: personal.weatherflowToken,
    useCelsius: metadata.use_celsius === true,
    theme,
  };
}

export function personalWeatherConfigFromPreferences(
  preferences: Pick<
    UserPreferences,
    | "weatherCityId"
    | "weatherSource"
    | "ambientWeatherMac"
    | "ambientWeatherApiKey"
    | "weatherflowStationId"
    | "weatherflowToken"
  >,
): PersonalWeatherConfig {
  return {
    source: preferences.weatherSource,
    openWeatherCityId: preferences.weatherCityId,
    ambientMac: preferences.ambientWeatherMac,
    ambientApiKey: preferences.ambientWeatherApiKey,
    weatherflowStationId: preferences.weatherflowStationId,
    weatherflowToken: preferences.weatherflowToken,
  };
}

export async function getUserPreferences(
  user: User | null | undefined,
): Promise<UserPreferences> {
  if (!user) {
    return DEFAULT_USER_PREFERENCES;
  }

  const displayPreferences = getDisplayPreferencesFromMetadata(user);
  const tempConfig = await getUserTempConfig(user);

  return {
    ...displayPreferences,
    tempFeeds: tempConfig.feeds,
    tempProbes: tempConfig.probes,
  };
}

export async function updateUserDisplayPreferences(
  accessToken: string,
  refreshToken: string,
  preferences: Pick<
    UserPreferences,
    | "showGarageTemps"
    | "showWeather"
    | "weatherCityId"
    | "weatherSource"
    | "ambientWeatherMac"
    | "ambientWeatherApiKey"
    | "weatherflowStationId"
    | "weatherflowToken"
    | "useCelsius"
    | "theme"
  >,
): Promise<{ user: User | null; error: Error | null }> {
  // Fresh client per call -- the shared `supabase` singleton would race
  // against any other concurrent request's auth calls (see its doc comment
  // in ./supabase.ts).
  const client = createAuthClient();
  const { data: sessionData, error: sessionError } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError || !sessionData.session) {
    return { user: null, error: sessionError ?? new Error("Invalid session") };
  }

  const personalPatch = personalWeatherMetadataPatch(
    personalWeatherConfigFromPreferences(preferences),
  );

  const { data, error } = await client.auth.updateUser({
    data: {
      show_garage_temps: preferences.showGarageTemps,
      show_weather: preferences.showWeather,
      weather_city_id: preferences.weatherCityId,
      use_celsius: preferences.useCelsius,
      theme: preferences.theme,
      ...personalPatch,
    },
  });

  if (error) {
    return { user: null, error };
  }

  return { user: data.user, error: null };
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark = true,
): "dark" | "light" {
  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light";
  }
  return preference;
}

export function parseDisplayPreferencesInput(input: {
  show_garage_temps?: string;
  show_weather?: string;
  use_celsius?: string;
  weather_city_id?: string;
  weather_source?: string;
  ambient_weather_mac?: string;
  ambient_weather_api_key?: string;
  weatherflow_station_id?: string;
  weatherflow_token?: string;
  theme?: string;
}): Pick<
  UserPreferences,
  | "showGarageTemps"
  | "showWeather"
  | "weatherCityId"
  | "weatherSource"
  | "ambientWeatherMac"
  | "ambientWeatherApiKey"
  | "weatherflowStationId"
  | "weatherflowToken"
  | "useCelsius"
  | "theme"
> {
  const weatherCityIdRaw = input.weather_city_id?.trim() ?? "";
  const weatherCityId = /^\d+$/.test(weatherCityIdRaw) ? weatherCityIdRaw : null;
  const themeRaw = input.theme;
  const theme: ThemePreference =
    themeRaw === "light" || themeRaw === "system" ? themeRaw : "dark";
  const sourceRaw = (input.weather_source ?? "openweather").trim().toLowerCase();
  const weatherSource: WeatherSource =
    sourceRaw === "ambient" || sourceRaw === "weatherflow" ? sourceRaw : "openweather";

  return {
    showGarageTemps: input.show_garage_temps === "true" || input.show_garage_temps === "on",
    showWeather: input.show_weather === "true" || input.show_weather === "on",
    weatherCityId,
    weatherSource,
    ambientWeatherMac: normalizeAmbientMac(input.ambient_weather_mac),
    ambientWeatherApiKey: input.ambient_weather_api_key?.trim() || null,
    weatherflowStationId: normalizeWeatherflowStationId(input.weatherflow_station_id),
    weatherflowToken: input.weatherflow_token?.trim() || null,
    useCelsius: input.use_celsius === "true" || input.use_celsius === "on",
    theme,
  };
}
