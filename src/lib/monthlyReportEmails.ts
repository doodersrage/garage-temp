import { createAdminClient } from "./supabase";
import { getAlertSettingsForUser, notifyUser } from "./notify";
import { fetchGarageTempChartData } from "./garageTempsHistory";
import { fetchNightsAtRisk } from "./FetchWeather";
import { getUserPreferences } from "./userPreferences";

export function shouldSendMonthlyReport(now = new Date()): boolean {
  return now.getUTCDate() === 1 && now.getUTCHours() === 8;
}

export async function sendMonthlyReportsForAllUsers(): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
}> {
  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("alert_settings")
    .select("user_id")
    .eq("monthly_report_enabled", true);

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows ?? []) {
    try {
      const ok = await sendMonthlyReportForUser(row.user_id);
      if (ok) sent += 1;
      else skipped += 1;
    } catch (error) {
      errors.push(
        `${row.user_id}: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }

  return { sent, skipped, errors };
}

async function sendMonthlyReportForUser(userId: string): Promise<boolean> {
  const settings = await getAlertSettingsForUser(userId);
  if (!settings.monthlyReportEnabled) return false;

  const admin = createAdminClient();
  const { data: authData } = await admin.auth.admin.getUserById(userId);
  const authUser = authData.user;
  const email = settings.email ?? authUser?.email ?? null;
  if (!email || !authUser) return false;

  const preferences = await getUserPreferences(authUser);
  const chart = await fetchGarageTempChartData(userId, 30);
  const nights = await fetchNightsAtRisk({
    cityId: preferences.weatherCityId,
    freezeThresholdF: settings.freezeThresholdF,
  });
  const nightsAtRisk = nights.filter((n) => n.atRisk).length;

  const temps = chart.map((p) => p.tempf);
  const minTemp = temps.length ? Math.min(...temps) : null;
  const maxTemp = temps.length ? Math.max(...temps) : null;
  const avgTemp = temps.length
    ? temps.reduce((a, b) => a + b, 0) / temps.length
    : null;

  const monthLabel = new Date().toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const lines = [
    `Garage Temp monthly report — ${monthLabel}`,
    "",
    `Readings (30d): ${chart.length}`,
    minTemp != null ? `Coldest: ${minTemp.toFixed(1)}°F` : "Coldest: —",
    maxTemp != null ? `Warmest: ${maxTemp.toFixed(1)}°F` : "Warmest: —",
    avgTemp != null ? `Average: ${avgTemp.toFixed(1)}°F` : "Average: —",
    `Forecast nights at risk (next 7d): ${nightsAtRisk}`,
    "",
    "Manage alerts: https://garage-temp.robmcd.name/dashboard/alerts",
  ];

  await notifyUser(userId, email, settings, {
    title: `Monthly garage report — ${monthLabel}`,
    body: lines.join("\n"),
    kind: "digest",
  });

  const supabase = createAdminClient();
  await supabase
    .from("alert_settings")
    .update({ last_monthly_report_at: new Date().toISOString() })
    .eq("user_id", userId);

  return true;
}
