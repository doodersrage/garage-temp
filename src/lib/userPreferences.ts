import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type UserPreferences = {
  showGarageTemps: boolean;
  showWeather: boolean;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  showGarageTemps: true,
  showWeather: true,
};

export function getUserPreferences(user: User | null | undefined): UserPreferences {
  if (!user?.user_metadata) {
    return DEFAULT_USER_PREFERENCES;
  }

  return {
    showGarageTemps: user.user_metadata.show_garage_temps !== false,
    showWeather: user.user_metadata.show_weather !== false,
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
    },
  });

  if (error) {
    return { user: null, error };
  }

  return { user: data.user, error: null };
}
