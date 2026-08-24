import type { TempFeedConfig, TempProbeConfig } from "./tempFeedConfig";
import { fetchTemps } from "./FetchTemps";
import {
  evaluateAlerts,
  getAlertSettingsFromMetadata,
  type AlertReading,
  type AlertSettings,
} from "./alerts";
import { supabase } from "./supabase";

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

export async function maybeSendThresholdAlerts(
  userId: string,
  email: string | null | undefined,
  userMetadata: Record<string, unknown> | undefined,
  feeds: TempFeedConfig[],
  probes: TempProbeConfig[],
): Promise<void> {
  const settings = getAlertSettingsFromMetadata(userMetadata);
  if (!settings.enabled) return;

  const alertEmail = settings.email ?? email;
  if (!alertEmail) return;

  const visibleProbes = probes.filter((probe) => probe.visible);
  const results = await fetchTemps({
    feeds,
    probes: visibleProbes,
    saveToDatabase: false,
  });

  const readings: AlertReading[] = visibleProbes.flatMap((probe) => {
    const feed = results.find((result) => result.id === probe.feedId);
    const data = feed?.probes[probe.key];
    if (!feed || feed.error || !data) return [];
    return [{ label: probe.label, tempf: data.f, humidity: data.h }];
  });

  const messages = evaluateAlerts(settings, readings);
  if (messages.length === 0) return;

  await sendAlertEmail(
    alertEmail,
    "Garage temperature alert",
    messages.join("\n"),
  );
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
      alert_settings: {
        enabled: settings.enabled,
        freeze_threshold_f: settings.freezeThresholdF,
        humidity_threshold: settings.humidityThreshold,
        email: settings.email,
      },
    },
  });

  return { error: error ?? null };
}
