import { createServerClient } from "./supabase";
import { checkFeedHealth, type FeedHealthStatus } from "./collectHistory";
import { getAlertSettingsForUser, notifyUser } from "./notify";
import { listAllHouseholdOwnerUserIds } from "./households";

export async function storeFeedUptimeChecks(
  userId: string,
  statuses: FeedHealthStatus[],
): Promise<void> {
  if (statuses.length === 0) return;
  const supabase = createServerClient();
  const rows = statuses.map((s) => ({
    user_id: userId,
    feed_id: s.feedId,
    feed_name: s.feedName,
    url: s.url,
    ok: s.ok,
    message: s.message,
    latency_ms: null,
    checked_at: s.checkedAt,
  }));
  await supabase.from("feed_uptime_checks" as "alert_events").insert(rows as never);
}

export async function runFeedUptimeForAllUsers(): Promise<{
  checked: number;
  failed: number;
  alertsSent: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let checked = 0;
  let failed = 0;
  let alertsSent = 0;
  const userIds = await listAllHouseholdOwnerUserIds();

  for (const userId of userIds) {
    try {
      const health = await checkFeedHealth(userId);
      if (health.error) {
        errors.push(`${userId}: ${health.error}`);
        continue;
      }
      await storeFeedUptimeChecks(userId, health.statuses);
      checked += health.statuses.length;
      const down = health.statuses.filter((s) => !s.ok);
      failed += down.length;

      if (down.length === 0) continue;

      const settings = await getAlertSettingsForUser(userId);
      if (!settings.feedUptimeAlertsEnabled) continue;

      const lastAt = settings.lastFeedUptimeAlertAt
        ? Date.parse(settings.lastFeedUptimeAlertAt)
        : 0;
      if (Date.now() - lastAt < 4 * 60 * 60 * 1000) continue;

      const body = down
        .map((s) => `${s.feedName}: ${s.message}`)
        .join("\n")
        .slice(0, 1500);

      await notifyUser(userId, settings.email, settings, {
        title: "Feed unreachable",
        body,
        kind: "outage",
      });

      const supabase = createServerClient();
      await supabase
        .from("alert_settings")
        .update({
          last_feed_uptime_alert_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq("user_id", userId);

      alertsSent += 1;
    } catch (err) {
      errors.push(
        `${userId}: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }

  return { checked, failed, alertsSent, errors };
}
