import {
  DEFAULT_ALERT_SETTINGS,
  type AlertSettings,
} from "./alerts";
import { parseAlertRulesFromForm } from "./alertRules";
import { parseSpaceChannelRouting } from "./spaceChannelRouting";
import { parseAlertTemplates } from "./alertTemplates";
import type { Entitlements } from "./entitlements";

function formHas(formData: FormData, key: string): boolean {
  return formData.has(key);
}

function formString(formData: FormData, key: string): string | null {
  const value = formData.get(key)?.toString().trim();
  return value || null;
}

function formNumber(
  formData: FormData,
  key: string,
  fallback: number,
): number {
  const raw = formData.get(key);
  if (raw == null || raw === "") return fallback;
  const num = Number(raw);
  return Number.isFinite(num) ? num : fallback;
}

/** Build alert settings from a dashboard form POST / Action FormData. */
export function buildAlertSettingsFromFormData(
  formData: FormData,
  existing: AlertSettings,
  entitlements: Entitlements,
): AlertSettings {
  return {
    ...DEFAULT_ALERT_SETTINGS,
    ...existing,
    enabled: formHas(formData, "alerts_enabled"),
    digestEnabled: formHas(formData, "digest_enabled"),
    freezeThresholdF: formNumber(
      formData,
      "freeze_threshold_f",
      existing.freezeThresholdF,
    ),
    humidityThreshold: formNumber(
      formData,
      "humidity_threshold",
      existing.humidityThreshold,
    ),
    rateChangeF: formNumber(formData, "rate_change_f", existing.rateChangeF),
    outageHours: formNumber(formData, "outage_hours", existing.outageHours),
    email: formString(formData, "alert_email"),
    channelEmail: formHas(formData, "channel_email"),
    channelSms: formHas(formData, "channel_sms") && entitlements.canUseSms,
    channelDiscord: formHas(formData, "channel_discord"),
    channelTelegram: formHas(formData, "channel_telegram"),
    channelSlack: formHas(formData, "channel_slack"),
    channelPush: formHas(formData, "channel_push") && entitlements.canUsePush,
    channelWebhook:
      formHas(formData, "channel_webhook") && entitlements.canUseOutboundWebhook,
    discordWebhookUrl: formString(formData, "discord_webhook_url"),
    smsPhone: formString(formData, "sms_phone"),
    outboundWebhookUrl: formString(formData, "outbound_webhook_url"),
    outboundWebhookSecret:
      formString(formData, "outbound_webhook_secret") ||
      existing.outboundWebhookSecret,
    telegramBotToken:
      formString(formData, "telegram_bot_token") || existing.telegramBotToken,
    telegramChatId: formString(formData, "telegram_chat_id"),
    slackWebhookUrl: formString(formData, "slack_webhook_url"),
    lastAlertSentAt: existing.lastAlertSentAt,
    lastOutageAlertAt: existing.lastOutageAlertAt,
    lastRateAlertAt: existing.lastRateAlertAt,
    lastForecastAlertAt: existing.lastForecastAlertAt,
    forecastFreezeEnabled: formHas(formData, "forecast_freeze_enabled"),
    forecastHoursAhead: formNumber(
      formData,
      "forecast_hours_ahead",
      existing.forecastHoursAhead,
    ),
    quietHoursEnabled: formHas(formData, "quiet_hours_enabled"),
    quietHoursStart:
      formString(formData, "quiet_hours_start") || existing.quietHoursStart,
    quietHoursEnd:
      formString(formData, "quiet_hours_end") || existing.quietHoursEnd,
    quietHoursTimezone:
      formString(formData, "quiet_hours_timezone") ||
      existing.quietHoursTimezone,
    quietHoursBypassFreeze: formHas(formData, "quiet_hours_bypass_freeze"),
    quietHoursSmsCritical:
      formHas(formData, "quiet_hours_sms_critical") && entitlements.canUseSms,
    alertRules: parseAlertRulesFromForm(
      formData.get("alert_rules_json")?.toString(),
    ),
    monthlyReportEnabled: formHas(formData, "monthly_report_enabled"),
    quarterlyReportEnabled: formHas(formData, "quarterly_report_enabled"),
    dripEmailsEnabled: formHas(formData, "drip_emails_enabled"),
    batteryAlertsEnabled: formHas(formData, "battery_alerts_enabled"),
    batteryTrendAlertsEnabled: formHas(formData, "battery_trend_alerts_enabled"),
    batteryThresholdPct: formNumber(
      formData,
      "battery_threshold_pct",
      existing.batteryThresholdPct,
    ),
    rssiAlertsEnabled: formHas(formData, "rssi_alerts_enabled"),
    rssiThreshold: formNumber(
      formData,
      "rssi_threshold",
      existing.rssiThreshold,
    ),
    snoozeUntil: existing.snoozeUntil,
    vacationUntil: existing.vacationUntil,
    lastBatteryAlertAt: existing.lastBatteryAlertAt,
    lastBatteryTrendAlertAt: existing.lastBatteryTrendAlertAt,
    lastRssiAlertAt: existing.lastRssiAlertAt,
    lastMonthlyReportAt: existing.lastMonthlyReportAt,
    escalationEnabled: formHas(formData, "escalation_enabled"),
    escalationMinutes: formNumber(
      formData,
      "escalation_minutes",
      existing.escalationMinutes,
    ),
    alertTemplates: (() => {
      try {
        const raw = formData.get("alert_templates_json")?.toString();
        const parsed = raw
          ? parseAlertTemplates(JSON.parse(raw))
          : existing.alertTemplates;
        return Object.fromEntries(
          Object.entries(parsed).filter(
            (entry): entry is [string, { title?: string; body?: string }] =>
              Boolean(entry[1]),
          ),
        );
      } catch {
        return existing.alertTemplates;
      }
    })(),
    telegramCommandSecret:
      formString(formData, "telegram_command_secret") ||
      existing.telegramCommandSecret,
    lastEscalationAt: existing.lastEscalationAt,
    channelSeverity: (() => {
      try {
        const raw = formData.get("channel_severity_json")?.toString();
        if (!raw) return existing.channelSeverity;
        const parsed = JSON.parse(raw) as Record<string, string[]>;
        return parsed && typeof parsed === "object"
          ? parsed
          : existing.channelSeverity;
      } catch {
        return existing.channelSeverity;
      }
    })(),
    readingWebhookUrl: formString(formData, "reading_webhook_url"),
    readingWebhookSecret:
      formString(formData, "reading_webhook_secret") ||
      existing.readingWebhookSecret,
    spaceChannelRouting: (() => {
      try {
        const raw = formData.get("space_channel_routing_json")?.toString();
        return raw
          ? parseSpaceChannelRouting(JSON.parse(raw))
          : existing.spaceChannelRouting;
      } catch {
        return existing.spaceChannelRouting;
      }
    })(),
  };
}

export function alertChannelsIncomplete(settings: AlertSettings): boolean {
  return (
    (settings.channelEmail && !settings.email) ||
    (settings.channelDiscord && !settings.discordWebhookUrl) ||
    (settings.channelTelegram &&
      (!settings.telegramBotToken || !settings.telegramChatId)) ||
    (settings.channelSlack && !settings.slackWebhookUrl) ||
    (settings.channelSms && !settings.smsPhone) ||
    (settings.channelWebhook && !settings.outboundWebhookUrl)
  );
}

/** Rebuild FormData from an Astro Action form input object. */
export function objectToFormData(
  input: Record<string, unknown>,
): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(input)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item != null) formData.append(key, String(item));
      }
      continue;
    }
    formData.set(key, String(value));
  }
  return formData;
}
