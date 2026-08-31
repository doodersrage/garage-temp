import { createServerClient } from "./supabase";
import { fetchAppStatusSummary } from "./appStatus";
import { sendEmail } from "./mailer";
import { brandedEmailParts } from "./emailLayout";
import { resolveSiteUrl } from "./schemaMarkup";
import {
  buildStatusUnsubscribeUrl,
  listConfirmedStatusSubscribers,
} from "./statusSubscriptions";

async function readLastKnownHealthy(): Promise<boolean | null | undefined> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("status_notify_state")
    .select("last_healthy")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("status-notify: failed to read state:", error.message);
    return undefined; // signals "couldn't determine", distinct from "no row yet"
  }

  return data ? data.last_healthy : null;
}

async function writeLastKnownHealthy(healthy: boolean): Promise<void> {
  const supabase = createServerClient();
  await supabase.from("status_notify_state").upsert({
    id: 1,
    last_healthy: healthy,
    updated_at: new Date().toISOString(),
  });
}

async function sendStatusChangeEmail(
  to: string,
  token: string,
  healthy: boolean,
): Promise<void> {
  const siteUrl = resolveSiteUrl(null);
  const { text, html } = brandedEmailParts({
    eyebrow: "Status update",
    title: healthy
      ? "ThermalTrace is back to normal"
      : "ThermalTrace is degraded",
    intro: healthy
      ? "Scheduled jobs and ingest monitoring are healthy again."
      : "We're seeing job failures or missed schedules. We're investigating.",
    cta: { label: "View system status", url: `${siteUrl}/system-status` },
    secondaryCta: {
      label: "Unsubscribe from status updates",
      url: buildStatusUnsubscribeUrl(token),
    },
    tone: healthy ? "success" : "alert",
    footerNote:
      "You're receiving this because you subscribed to ThermalTrace status updates.",
  });

  await sendEmail(
    to,
    healthy ? "ThermalTrace: back to normal" : "ThermalTrace: service degraded",
    text,
    { html },
  );
}

export type StatusNotifyResult = {
  changed: boolean;
  healthy: boolean | null;
  sent: number;
  errors: string[];
};

/**
 * Checks current system health against the last known state and, only on a
 * genuine up/down transition, emails every confirmed subscriber. Called
 * once per scheduled run (see worker.ts) -- intentionally a no-op on the
 * very first run (no prior state) so deploying this doesn't fire a
 * spurious "back to normal" email to nobody's history.
 */
export async function checkAndNotifyStatusSubscribers(): Promise<StatusNotifyResult> {
  const summary = await fetchAppStatusSummary();
  if (!summary) {
    return { changed: false, healthy: null, sent: 0, errors: ["status check failed"] };
  }

  const lastHealthy = await readLastKnownHealthy();
  if (lastHealthy === undefined) {
    return { changed: false, healthy: summary.healthy, sent: 0, errors: ["state read failed"] };
  }

  if (lastHealthy === null) {
    // First run ever -- just record a baseline, don't notify.
    await writeLastKnownHealthy(summary.healthy);
    return { changed: false, healthy: summary.healthy, sent: 0, errors: [] };
  }

  if (lastHealthy === summary.healthy) {
    return { changed: false, healthy: summary.healthy, sent: 0, errors: [] };
  }

  const subscribers = await listConfirmedStatusSubscribers();
  const errors: string[] = [];
  let sent = 0;

  for (const subscriber of subscribers) {
    try {
      await sendStatusChangeEmail(subscriber.email, subscriber.token, summary.healthy);
      sent += 1;
    } catch (error) {
      errors.push(
        `${subscriber.email}: ${error instanceof Error ? error.message : "send failed"}`,
      );
    }
  }

  await writeLastKnownHealthy(summary.healthy);

  return { changed: true, healthy: summary.healthy, sent, errors };
}
