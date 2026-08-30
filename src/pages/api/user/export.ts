import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getUserHouseholdId } from "../../../lib/households";
import { getAlertSettingsForUser } from "../../../lib/notify";
import { getUserPreferences } from "../../../lib/userPreferences";
import { fetchGarageTempHistory, fetchGarageTempChartData } from "../../../lib/garageTempsHistory";
import { listHouseholdDevices } from "../../../lib/devices";
import { getUserEntitlements } from "../../../lib/entitlements";

export const GET: APIRoute = async ({ cookies }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const householdId = await getUserHouseholdId(user.id);
  const [preferences, alertSettings, history, chart, devices, entitlements] =
    await Promise.all([
      getUserPreferences(user),
      getAlertSettingsForUser(user.id, user.user_metadata as Record<string, unknown>),
      fetchGarageTempHistory(user.id, 1, 50),
      fetchGarageTempChartData(user.id, 30),
      householdId ? listHouseholdDevices(householdId) : Promise.resolve({ devices: [], error: null }),
      getUserEntitlements(user.id),
    ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user: { id: user.id, email: user.email },
    preferences,
    alert_settings: alertSettings,
    entitlements: {
      tier: entitlements.tier,
      canDownloadCsv: entitlements.canDownloadCsv,
      canUseClaimsPack: entitlements.canUseClaimsPack,
      canCreateShareLinks: entitlements.canCreateShareLinks,
      canUsePush: entitlements.canUsePush,
      canUseSms: entitlements.canUseSms,
      historyDays: entitlements.historyDays,
    },
    history: history.readings,
    chart_30d: chart.points,
    devices: devices.devices.map((d) => ({
      name: d.name,
      source: d.source,
      space: d.space,
      sensors: d.sensors.map((s) => ({
        key: s.key,
        label: s.label,
        kind: s.kind,
      })),
      meta: d.meta,
    })),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="thermaltrace-export.json"',
    },
  });
};
