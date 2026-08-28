import { createAdminClient } from "./supabase";
import { resolveSiteUrl } from "./schemaMarkup";
import {
  isMailerRecipientNotAllowed,
  partitionMailErrors,
  sendPlainEmail,
} from "./mailer";

const REMINDER_DAYS = [3, 1] as const;

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const end = Date.parse(iso);
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
}

export function trialJobShouldFail(errors: string[]): boolean {
  return partitionMailErrors(errors).hardErrors.length > 0;
}

export async function sendTrialRemindersForAllUsers(): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
  restricted: number;
}> {
  const supabase = createAdminClient();
  const { data: subs } = await supabase
    .from("stripe_subscriptions")
    .select("user_id, status, current_period_end, plan_tier")
    .eq("status", "trialing");

  let sent = 0;
  let skipped = 0;
  let restricted = 0;
  const errors: string[] = [];
  const siteUrl = resolveSiteUrl(null);

  for (const sub of subs ?? []) {
    try {
      const remaining = daysUntil(sub.current_period_end);
      if (remaining == null || !REMINDER_DAYS.includes(remaining as 3 | 1)) {
        skipped += 1;
        continue;
      }

      const { data: settings } = await supabase
        .from("alert_settings")
        .select("last_trial_reminder_at")
        .eq("user_id", sub.user_id)
        .maybeSingle();

      const last = settings?.last_trial_reminder_at
        ? Date.parse(settings.last_trial_reminder_at)
        : 0;
      if (Date.now() - last < 20 * 60 * 60 * 1000) {
        skipped += 1;
        continue;
      }

      const { data: userData } = await supabase.auth.admin.getUserById(sub.user_id);
      const email = userData.user?.email;
      if (!email) {
        skipped += 1;
        continue;
      }

      const plan = sub.plan_tier === "pro" ? "Pro" : "Member";
      const subject =
        remaining === 1
          ? `Your ThermalTrace ${plan} trial ends tomorrow`
          : `Your ThermalTrace ${plan} trial ends in ${remaining} days`;
      const body = [
        `Hi,`,
        ``,
        `Your ${plan} trial ends ${remaining === 1 ? "tomorrow" : `in ${remaining} days`}.`,
        `Keep SMS, push, share links, and integrations without interruption:`,
        `${siteUrl}/dashboard/plans`,
        ``,
        `Manage billing anytime from the dashboard.`,
      ].join("\n");

      await sendPlainEmail(email, subject, body);
      await supabase
        .from("alert_settings")
        .update({
          last_trial_reminder_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", sub.user_id);
      sent += 1;
    } catch (error) {
      if (isMailerRecipientNotAllowed(error)) {
        restricted += 1;
        errors.push(
          `${sub.user_id}: ${error instanceof Error ? error.message : "recipient not allowed"}`,
        );
        continue;
      }
      errors.push(
        `${sub.user_id}: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }

  return { sent, skipped, errors, restricted };
}
