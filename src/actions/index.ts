import { defineAction, ActionError } from "astro:actions";
import { z } from "astro/zod";
import { getAuthFromCookies, setAuthCookies } from "../lib/auth";
import {
  updateUserDisplayPreferences,
  type ThemePreference,
} from "../lib/userPreferences";
import { supabase } from "../lib/supabase";

export const server = {
  updateDisplayPreferences: defineAction({
    accept: "form",
    input: z.object({
      show_garage_temps: z.string().optional(),
      show_weather: z.string().optional(),
      use_celsius: z.string().optional(),
      weather_city_id: z.string().optional(),
      theme: z.enum(["dark", "light", "system"]).optional(),
      redirect: z.string().optional(),
    }),
    handler: async (input, context) => {
      const { session, user } = await getAuthFromCookies(context.cookies);
      if (!session || !user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Sign in to save preferences.",
        });
      }

      const accessToken = context.cookies.get("sb-access-token")?.value;
      const refreshToken = context.cookies.get("sb-refresh-token")?.value;
      if (!accessToken || !refreshToken) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Session expired. Sign in again.",
        });
      }

      const weatherCityIdRaw = input.weather_city_id?.trim() ?? "";
      const weatherCityId = /^\d+$/.test(weatherCityIdRaw) ? weatherCityIdRaw : null;
      const theme: ThemePreference =
        input.theme === "light" || input.theme === "system" ? input.theme : "dark";

      const { error } = await updateUserDisplayPreferences(accessToken, refreshToken, {
        showGarageTemps: input.show_garage_temps === "true" || input.show_garage_temps === "on",
        showWeather: input.show_weather === "true" || input.show_weather === "on",
        weatherCityId,
        useCelsius: input.use_celsius === "true" || input.use_celsius === "on",
        theme,
      });

      if (error) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: error.message || "Could not save display preferences.",
        });
      }

      context.cookies.set("theme", theme, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });

      const { data: refreshedSession } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (refreshedSession.session) {
        setAuthCookies(
          context.cookies,
          refreshedSession.session.access_token,
          refreshedSession.session.refresh_token,
        );
      }

      return {
        ok: true as const,
        theme,
        message: "Display preferences saved.",
      };
    },
  }),
};
