import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { updateUserAlertSettings } from "../../../lib/alertNotifications";
import {
  DEFAULT_ALERT_SETTINGS,
  type AlertSettings,
} from "../../../lib/alerts";
import { parseAlertRulesFromForm } from "../../../lib/alertRules";
import { getAlertSettingsForUser } from "../../../lib/notify";
import { getUserEntitlements } from "../../../lib/entitlements";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard/alerts";
  const existing = await getAlertSettingsForUser(
    user.id,
    user.user_metadata as Record<string, unknown> | undefined,
  );
  const entitlements = await getUserEntitlements(user.id);

  const settings: AlertSettings = {
    ...DEFAULT_ALERT_SETTINGS,
    ...existing,
    enabled: formData.has("alerts_enabled"),
    digestEnabled: formData.has("digest_enabled"),
    freezeThresholdF: Number(
      formData.get("freeze_threshold_f") ?? existing.freezeThresholdF,
    ),
    humidityThreshold: Number(
      formData.get("humidity_threshold") ?? existing.humidityThreshold,
    ),
    rateChangeF: Number(formData.get("rate_change_f") ?? existing.rateChangeF),
    outageHours: Number(formData.get("outage_hours") ?? existing.outageHours),
    email: formData.get("alert_email")?.toString().trim() || null,
    channelEmail: formData.has("channel_email"),
    channelSms: formData.has("channel_sms") && entitlements.canUseSms,
    channelDiscord: formData.has("channel_discord"),
    channelTelegram: formData.has("channel_telegram"),
    channelSlack: formData.has("channel_slack"),
    channelPush: formData.has("channel_push") && entitlements.canUsePush,
    channelWebhook:
      formData.has("channel_webhook") && entitlements.canUseOutboundWebhook,
    discordWebhookUrl:
      formData.get("discord_webhook_url")?.toString().trim() || null,
    smsPhone: formData.get("sms_phone")?.toString().trim() || null,
    outboundWebhookUrl:
      formData.get("outbound_webhook_url")?.toString().trim() || null,
    outboundWebhookSecret:
      formData.get("outbound_webhook_secret")?.toString().trim() ||
      existing.outboundWebhookSecret,
    telegramBotToken:
      formData.get("telegram_bot_token")?.toString().trim() ||
      existing.telegramBotToken,
    telegramChatId:
      formData.get("telegram_chat_id")?.toString().trim() || null,
    slackWebhookUrl:
      formData.get("slack_webhook_url")?.toString().trim() || null,
    lastAlertSentAt: existing.lastAlertSentAt,
    lastOutageAlertAt: existing.lastOutageAlertAt,
    lastRateAlertAt: existing.lastRateAlertAt,
    lastForecastAlertAt: existing.lastForecastAlertAt,
    forecastFreezeEnabled: formData.has("forecast_freeze_enabled"),
    forecastHoursAhead: Number(
      formData.get("forecast_hours_ahead") ?? existing.forecastHoursAhead,
    ),
    quietHoursEnabled: formData.has("quiet_hours_enabled"),
    quietHoursStart:
      formData.get("quiet_hours_start")?.toString().trim() ||
      existing.quietHoursStart,
    quietHoursEnd:
      formData.get("quiet_hours_end")?.toString().trim() || existing.quietHoursEnd,
    quietHoursTimezone:
      formData.get("quiet_hours_timezone")?.toString().trim() ||
      existing.quietHoursTimezone,
    quietHoursBypassFreeze: formData.has("quiet_hours_bypass_freeze"),
    alertRules: parseAlertRulesFromForm(
      formData.get("alert_rules_json")?.toString(),
    ),
    channelSeverity: existing.channelSeverity,
  };

  const { error } = await updateUserAlertSettings(
    session.access_token,
    session.refresh_token,
    user.id,
    settings,
  );

  if (error) {
    return redirect(`${redirectTo}?alert_error=1`);
  }

  const incomplete =
    (settings.channelEmail && !settings.email) ||
    (settings.channelDiscord && !settings.discordWebhookUrl) ||
    (settings.channelTelegram &&
      (!settings.telegramBotToken || !settings.telegramChatId)) ||
    (settings.channelSlack && !settings.slackWebhookUrl) ||
    (settings.channelSms && !settings.smsPhone) ||
    (settings.channelWebhook && !settings.outboundWebhookUrl);

  const params = new URLSearchParams({ alert_saved: "1" });
  if (incomplete) params.set("channels_incomplete", "1");
  return redirect(`${redirectTo}?${params.toString()}`);
};
