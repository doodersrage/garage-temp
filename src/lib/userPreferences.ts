import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { TempFeedConfig, TempProbeConfig } from "./tempFeedConfig";
import {
  getDefaultTempFeeds,
  getDefaultTempProbes,
} from "./tempFeedConfig";
import { getUserTempConfig } from "./userTempConfig";

export type ThemePreference = "dark" | "light" | "system";

export type UserPreferences = {
  showGarageTemps: boolean;
  showWeather: boolean;
  weatherCityId: string | null;
  useCelsius: boolean;
  theme: ThemePreference;
  tempFeeds: TempFeedConfig[];
  tempProbes: TempProbeConfig[];
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  showGarageTemps: true,
  showWeather: true,
  weatherCityId: null,
  useCelsius: false,
  theme: "dark",
  tempFeeds: getDefaultTempFeeds(),
  tempProbes: getDefaultTempProbes(),
};

function getDisplayPreferencesFromMetadata(
  user: User | null | undefined,
): Pick<
  UserPreferences,
  "showGarageTemps" | "showWeather" | "weatherCityId" | "useCelsius" | "theme"
> {
  if (!user?.user_metadata) {
    return {
      showGarageTemps: DEFAULT_USER_PREFERENCES.showGarageTemps,
      showWeather: DEFAULT_USER_PREFERENCES.showWeather,
      weatherCityId: DEFAULT_USER_PREFERENCES.weatherCityId,
      useCelsius: DEFAULT_USER_PREFERENCES.useCelsius,
      theme: DEFAULT_USER_PREFERENCES.theme,
    };
  }

  const metadata = user.user_metadata;
  const themeRaw = metadata.theme;
  const theme: ThemePreference =
    themeRaw === "light" || themeRaw === "system" ? themeRaw : "dark";

  return {
    showGarageTemps: metadata.show_garage_temps !== false,
    showWeather: metadata.show_weather !== false,
    weatherCityId:
      typeof metadata.weather_city_id === "string" &&
      /^\d+$/.test(metadata.weather_city_id.trim())
        ? metadata.weather_city_id.trim()
        : null,
    useCelsius: metadata.use_celsius === true,
    theme,
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
    "showGarageTemps" | "showWeather" | "weatherCityId" | "useCelsius" | "theme"
  >,
): Promise<{ user: User | null; error: Error | null }> {
  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError || !sessionData.session) {
    return { user: null, error: sessionError ?? new Error("Invalid session") };
  }

  const { data, error } = await supabase.auth.updateUser({
    data: {
      show_garage_temps: preferences.showGarageTemps,
      show_weather: preferences.showWeather,
      weather_city_id: preferences.weatherCityId,
      use_celsius: preferences.useCelsius,
      theme: preferences.theme,
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
