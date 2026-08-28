import { fetchCrossPropertySnapshots } from "./crossProperty";
import { getAlertSettingsForUser, notifyUser } from "./notify";
import { createServerClient } from "./supabase";
import { listUserHouseholds } from "./households";

const PORTFOLIO_COOLDOWN_MS = 4 * 60 * 60 * 1000;

export async function sendPortfolioAlertsForAllUsers(): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let sent = 0;
  let skipped = 0;
  const supabase = createServerClient();
  const { createAdminClient } = await import("./supabase");
  const admin = createAdminClient();

  const { data: owners } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("role", "owner");

  const userIds = [...new Set((owners ?? []).map((r) => r.user_id))];

  for (const userId of userIds) {
    try {
      const { households } = await listUserHouseholds(userId);
      if (households.length < 2) {
        skipped += 1;
        continue;
      }

      const { data: userData } = await admin.auth.admin.getUserById(userId);
      const email = userData.user?.email ?? null;
      const settings = await getAlertSettingsForUser(
        userId,
        userData.user?.user_metadata as Record<string, unknown>,
      );

      if (!settings.enabled || !settings.portfolioAlertsEnabled) {
        skipped += 1;
        continue;
      }

      if (settings.lastPortfolioAlertAt) {
        const last = Date.parse(settings.lastPortfolioAlertAt);
        if (Date.now() - last < PORTFOLIO_COOLDOWN_MS) {
          skipped += 1;
          continue;
        }
      }

      const { properties } = await fetchCrossPropertySnapshots(userId);
      const atRisk = properties.filter((p) => p.atRisk);
      if (atRisk.length === 0) {
        skipped += 1;
        continue;
      }

      const body = atRisk
        .map(
          (p) =>
            `${p.name}: ${p.minTempF?.toFixed(1)}°F (threshold ${p.freezeThresholdF}°F)`,
        )
        .join("\n");

      await notifyUser(userId, email, settings, {
        title: `Portfolio freeze risk (${atRisk.length} propert${atRisk.length === 1 ? "y" : "ies"})`,
        body,
        kind: "threshold",
      });

      await supabase
        .from("alert_settings")
        .update({
          last_portfolio_alert_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      sent += 1;
    } catch (err) {
      errors.push(
        `${userId}: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }

  return { sent, skipped, errors };
}
