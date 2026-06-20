import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type UserPreferences = {
  showGarageTemps: boolean;
  showWeather: boolean;
  showProbe0: boolean;
  showProbe1: boolean;
  showProbeAvg: boolean;
  weatherCityId: string | null;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  showGarageTemps: true,
  showWeather: true,
  showProbe0: true,
  showProbe1: true,
  showProbeAvg: true,
  weatherCityId: null,
};

export function getUserPreferences(user: User | null | undefined): UserPreferences {
  if (!user?.user_metadata) {
    return DEFAULT_USER_PREFERENCES;
  }

  const metadata = user.user_metadata;

  return {
    showGarageTemps: metadata.show_garage_temps !== false,
    showWeather: metadata.show_weather !== false,
    showProbe0: metadata.show_probe_0 !== false,
    showProbe1: metadata.show_probe_1 !== false,
    showProbeAvg: metadata.show_probe_avg !== false,
    weatherCityId:
      typeof metadata.weather_city_id === "string" &&
      /^\d+$/.test(metadata.weather_city_id.trim())
        ? metadata.weather_city_id.trim()
        : null,
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
      show_probe_0: preferences.showProbe0,
      show_probe_1: preferences.showProbe1,
      show_probe_avg: preferences.showProbeAvg,
      weather_city_id: preferences.weatherCityId,
    },
  });

  if (error) {
    return { user: null, error };
  }

  return { user: data.user, error: null };
}
