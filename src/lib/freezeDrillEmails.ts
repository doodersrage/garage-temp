import { createAdminClient } from "./supabase";
import { getAlertSettingsForUser, notifyUser } from "./notify";
import { brandedEmailParts } from "./emailLayout";
import { resolveSiteUrl } from "./schemaMarkup";
import { sendEmail } from "./mailer";
import { computeFreezeReadiness } from "./freezeReadiness";
import { listAllHouseholdOwnerUserIds } from "./households";
import { listHouseholdDevices } from "./devices";
import { fetchLatestSensorValues } from "./sensorReadings";
import { getUserEntitlements } from "./entitlements";
import { getUserPreferences } from "./userPreferences";

/** Sep 1 – Nov 15 (Northern Hemisphere pre-season). */
export function shouldSendFreezeDrill(now = new Date()): boolean {
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  if (month === 9 || month === 10) return true;
  if (month === 11 && day <= 15) return true;
  return false;
}

export function monthsSince(iso: string | null | undefined, now = Date.now()): number {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return Infinity;
  return (now - t) / (30 * 24 * 60 * 60 * 1000);
}

export async function sendFreezeDrillsForAllUsers(): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
}> {
  if (!shouldSendFreezeDrill()) {
    return { sent: 0, skipped: 0, errors: [] };
  }

  const admin = createAdminClient();
  const ownerIds = await listAllHouseholdOwnerUserIds();
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];
  const siteUrl = resolveSiteUrl(null);

  for (const userId of ownerIds) {
    try {
      const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
      if (userError || !userData.user) {
        skipped += 1;
        continue;
      }
      const user = userData.user;
      const settings = await getAlertSettingsForUser(userId, user.user_metadata as Record<string, unknown>);

      if (settings.freezeDrillEnabled === false) {
        skipped += 1;
        continue;
      }

      if (monthsSince(settings.lastFreezeDrillAt) < 11) {
        skipped += 1;
        continue;
      }

      const entitlements = await getUserEntitlements(userId);
      const prefs = await getUserPreferences(user);
      const { data: member } = await admin
        .from("household_members")
        .select("household_id")
        .eq("user_id", userId)
        .eq("role", "owner")
        .limit(1)
        .maybeSingle();

      const householdId = member?.household_id ?? null;
      const devicesResult = householdId
        ? await listHouseholdDevices(householdId)
        : { devices: [] };
      const latest = householdId ? await fetchLatestSensorValues(householdId) : [];

      const readiness = computeFreezeReadiness({
        alertSettings: settings,
        devices: devicesResult.devices,
        latest,
        weatherCityId: prefs.weatherCityId,
        canUseForecast: entitlements.canUseForecastAlerts,
        canUseNws: entitlements.canUseNwsAlerts,
        hasSentAnyAlert: Boolean(settings.lastAlertSentAt),
      });

      const checklist = readiness.checks
        .map((c) => `${c.ok ? "✓" : "○"} ${c.label}`)
        .join("\n");

      const parts = brandedEmailParts({
        eyebrow: "Pre-season freeze drill",
        preheader: `Readiness score ${readiness.score}%`,
        title: "Time for your freeze-season check",
        intro: `Before the first hard freeze, confirm alerts and probes are ready.\n\nReadiness: ${readiness.score}%\n\n${checklist}`,
        cta: { label: "Open dashboard", url: `${siteUrl}/dashboard` },
        secondaryCta: { label: "Send test alert", url: `${siteUrl}/dashboard/alerts#send-test-alert` },
        tone: "default",
        footerNote: "Disable pre-season drills in Dashboard → Alerts.",
      });

      if (user.email) {
        await sendEmail(user.email, `Freeze readiness ${readiness.score}% — pre-season drill`, parts.text, {
          html: parts.html,
        });
      }

      await notifyUser(
        userId,
        user.email,
        settings,
        {
          title: "Pre-season freeze drill",
          body: `Readiness ${readiness.score}%. Open the dashboard and send a test alert if you have not this season.`,
          kind: "generic",
        },
      );

      await admin
        .from("alert_settings")
        .update({ last_freeze_drill_at: new Date().toISOString() })
        .eq("user_id", userId);

      sent += 1;
    } catch (error) {
      errors.push(`${userId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { sent, skipped, errors };
}
