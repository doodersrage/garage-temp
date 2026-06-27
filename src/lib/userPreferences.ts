import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { TempFeedConfig, TempProbeConfig } from "./tempFeedConfig";
import {
  getDefaultTempFeeds,
  getDefaultTempProbes,
  getLegacyTempProbes,
  sanitizeTempFeeds,
  sanitizeTempProbes,
} from "./tempFeedConfig";

export type UserPreferences = {
  showGarageTemps: boolean;
  showWeather: boolean;
  weatherCityId: string | null;
  tempFeeds: TempFeedConfig[];
  tempProbes: TempProbeConfig[];
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  showGarageTemps: true,
  showWeather: true,
  weatherCityId: null,
  tempFeeds: getDefaultTempFeeds(),
  tempProbes: getDefaultTempProbes(),
};

export function getUserPreferences(user: User | null | undefined): UserPreferences {
  if (!user?.user_metadata) {
    return DEFAULT_USER_PREFERENCES;
  }

  const metadata = user.user_metadata;
  const tempFeeds = metadata.temp_feeds
    ? sanitizeTempFeeds(metadata.temp_feeds)
    : getDefaultTempFeeds();
  const tempProbes = metadata.temp_probes
    ? sanitizeTempProbes(metadata.temp_probes, tempFeeds)
    : getLegacyTempProbes(metadata);

  return {
    showGarageTemps: metadata.show_garage_temps !== false,
    showWeather: metadata.show_weather !== false,
    weatherCityId:
      typeof metadata.weather_city_id === "string" &&
      /^\d+$/.test(metadata.weather_city_id.trim())
        ? metadata.weather_city_id.trim()
        : null,
    tempFeeds,
    tempProbes,
  };
}

export async function updateUserPreferences(
  accessToken: string,
  refreshToken: string,
  preferences: UserPreferences,
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
      temp_feeds: preferences.tempFeeds,
      temp_probes: preferences.tempProbes,
    },
  });

  if (error) {
    return { user: null, error };
  }

  return { user: data.user, error: null };
}
