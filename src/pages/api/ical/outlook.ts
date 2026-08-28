import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getAlertSettingsForUser } from "../../../lib/notify";
import { getUserPreferences } from "../../../lib/userPreferences";
import { fetchNightsAtRisk } from "../../../lib/FetchWeather";
import { buildFreezeOutlookIcal } from "../../../lib/icalFeed";

export const GET: APIRoute = async ({ cookies }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [settings, preferences] = await Promise.all([
    getAlertSettingsForUser(user.id, user.user_metadata as Record<string, unknown>),
    getUserPreferences(user),
  ]);

  const nights = await fetchNightsAtRisk({
    cityId: preferences.weatherCityId,
    freezeThresholdF: settings.freezeThresholdF,
  });

  const body = buildFreezeOutlookIcal(nights);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="thermaltrace-freeze-outlook.ics"',
      "Cache-Control": "no-store",
    },
  });
};
