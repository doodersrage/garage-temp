import type { User } from "@supabase/supabase-js";
import type { AlertSettings } from "./alerts";
import { ALERT_CHANNEL_LABELS } from "./alertChannelLabels";
import { getAlertSettingsForUser } from "./notify";
import { getUserHouseholdId } from "./households";
import { listHouseholdDevices } from "./devices";
import { createServerClient } from "./supabase";
import {
  buildMonitoringCertificateHtml,
  type MonitoringCertificateData,
} from "./monitoringCertificate";
import type { ClaimsDeviceSummary } from "./claimsPack";

function listConfiguredAlertChannels(settings: AlertSettings): string[] {
  const channels: string[] = [];
  if (settings.channelEmail && settings.email?.trim()) {
    channels.push(ALERT_CHANNEL_LABELS.email ?? "email");
  }
  if (settings.channelSms && settings.smsPhone?.trim()) {
    channels.push(ALERT_CHANNEL_LABELS.sms ?? "SMS");
  }
  if (settings.channelDiscord && settings.discordWebhookUrl?.trim()) {
    channels.push(ALERT_CHANNEL_LABELS.discord ?? "Discord");
  }
  if (settings.channelTelegram && settings.telegramBotToken?.trim()) {
    channels.push(ALERT_CHANNEL_LABELS.telegram ?? "Telegram");
  }
  if (settings.channelSlack && settings.slackWebhookUrl?.trim()) {
    channels.push(ALERT_CHANNEL_LABELS.slack ?? "Slack");
  }
  if (settings.channelTeams && settings.teamsWebhookUrl?.trim()) {
    channels.push(ALERT_CHANNEL_LABELS.teams ?? "Teams");
  }
  if (settings.channelNtfy && settings.ntfyTopic?.trim()) {
    channels.push(ALERT_CHANNEL_LABELS.ntfy ?? "ntfy");
  }
  if (settings.channelPushover && settings.pushoverUserKey?.trim()) {
    channels.push(ALERT_CHANNEL_LABELS.pushover ?? "Pushover");
  }
  if (settings.channelWhatsapp && settings.whatsappPhone?.trim()) {
    channels.push(ALERT_CHANNEL_LABELS.whatsapp ?? "WhatsApp");
  }
  if (settings.channelPush) {
    channels.push(ALERT_CHANNEL_LABELS.push ?? "browser push");
  }
  if (settings.channelWebhook && settings.outboundWebhookUrl?.trim()) {
    channels.push(ALERT_CHANNEL_LABELS.webhook ?? "webhook");
  }
  return channels;
}

export async function generateMonitoringCertificateForUser(
  user: Pick<User, "id" | "email" | "user_metadata">,
  siteUrl: string,
): Promise<{ html: string | null; filename: string; error: string | null }> {
  const householdId = await getUserHouseholdId(user.id);
  if (!householdId) {
    return { html: null, filename: "thermaltrace-monitoring-certificate.html", error: "No household" };
  }

  const [alertSettings, devicesResult, householdRow] = await Promise.all([
    getAlertSettingsForUser(user.id, user.user_metadata as Record<string, unknown>),
    listHouseholdDevices(householdId),
    createServerClient().from("households").select("name").eq("id", householdId).maybeSingle(),
  ]);

  const devices: ClaimsDeviceSummary[] = devicesResult.devices.map((d) => ({
    name: d.name,
    space: d.space ?? null,
    sensors: d.sensors
      .filter((s) => s.visible)
      .map((s) => ({ label: s.label, kind: s.kind })),
  }));

  const exportedAt = new Date().toISOString();
  const householdLabel =
    (householdRow.data as { name?: string } | null)?.name?.trim() ||
    user.email ||
    "Household";

  const data: MonitoringCertificateData = {
    exportedAt,
    householdLabel,
    accountEmail: user.email ?? null,
    freezeThresholdF: alertSettings.freezeThresholdF,
    devices,
    alertChannels: listConfiguredAlertChannels(alertSettings),
    alertsEnabled: alertSettings.enabled,
    nwsEnabled: alertSettings.nwsFreezeAlertsEnabled,
    forecastEnabled: alertSettings.forecastFreezeEnabled,
    dataRetentionDays: alertSettings.dataRetentionDays,
    siteUrl,
  };

  const slug = householdLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return {
    html: buildMonitoringCertificateHtml(data),
    filename: `thermaltrace-monitoring-${slug || "certificate"}.html`,
    error: null,
  };
}
