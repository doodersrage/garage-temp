import type { TempFeedConfig, TempFeedResult, TempProbeConfig } from "./tempFeedConfig";
import {
  evaluateAlerts,
  getAlertSettingsFromMetadata,
  isAlertCooldownActive,
  serializeAlertSettings,
  type AlertReading,
  type AlertSettings,
} from "./alerts";
import { createAdminClient, supabase } from "./supabase";

async function sendAlertEmail(
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  try {
    const { EmailMessage } = await import("cloudflare:email");
    const { createMimeMessage } = await import("mimetext");
    const { env } = await import("cloudflare:workers");

    const msg = createMimeMessage();
    msg.setSender({
      name: "Garage Temp Monitor",
      addr: import.meta.env.SMTP_MAIL_FROM,
    });
    msg.setRecipient(to);
    msg.setSubject(subject);
    msg.addMessage({ contentType: "text/plain", data: body });

    const mail = new EmailMessage(
      import.meta.env.SMTP_MAIL_FROM,
      to,
      msg.asRaw(),
    );

    await env.MAILER.send(mail);
  } catch (error) {
    console.error("Failed to send alert email:", error);
  }
}

function buildReadingsFromResults(
  results: TempFeedResult[],
  probes: TempProbeConfig[],
): AlertReading[] {
  return probes.flatMap((probe) => {
    const feed = results.find((result) => result.id === probe.feedId);
    const data = feed?.probes[probe.key];
    if (!feed || feed.error || !data) return [];
    return [{ label: probe.label, tempf: data.f, humidity: data.h }];
  });
}

async function markAlertSent(
  userId: string,
  settings: AlertSettings,
): Promise<void> {
  const admin = createAdminClient();
  const sentAt = new Date().toISOString();
  const nextSettings = { ...settings, lastAlertSentAt: sentAt };

  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      alert_settings: serializeAlertSettings(nextSettings),
    },
  });

  if (error) {
    console.error("Failed to update alert cooldown metadata:", error.message);
  }
}

export async function sendThresholdAlertsIfNeeded(
  userId: string,
  email: string | null | undefined,
  userMetadata: Record<string, unknown> | undefined,
  readings: AlertReading[],
): Promise<void> {
  const settings = getAlertSettingsFromMetadata(userMetadata);
  if (!settings.enabled || readings.length === 0) return;

  const alertEmail = settings.email ?? email;
  if (!alertEmail) return;

  if (isAlertCooldownActive(settings)) return;

  const messages = evaluateAlerts(settings, readings);
  if (messages.length === 0) return;

  await sendAlertEmail(
    alertEmail,
    "Garage temperature alert",
    messages.join("\n"),
  );
  await markAlertSent(userId, settings);
}

export async function maybeSendThresholdAlerts(
  userId: string,
  email: string | null | undefined,
  userMetadata: Record<string, unknown> | undefined,
  feeds: TempFeedConfig[],
  probes: TempProbeConfig[],
  existingResults?: TempFeedResult[],
): Promise<void> {
  const visibleProbes = probes.filter((probe) => probe.visible);
  if (visibleProbes.length === 0) return;

  let results = existingResults;
  if (!results) {
    const { fetchTemps } = await import("./FetchTemps");
    results = await fetchTemps({
      feeds,
      probes: visibleProbes,
      saveToDatabase: false,
    });
  }

  const readings = buildReadingsFromResults(results, visibleProbes);
  await sendThresholdAlertsIfNeeded(userId, email, userMetadata, readings);
}

export async function updateUserAlertSettings(
  accessToken: string,
  refreshToken: string,
  settings: AlertSettings,
): Promise<{ error: Error | null }> {
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError) {
    return { error: sessionError };
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      alert_settings: serializeAlertSettings(settings),
    },
  });

  return { error: error ?? null };
}
