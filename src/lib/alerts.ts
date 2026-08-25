export type AlertSettings = {
  enabled: boolean;
  digestEnabled: boolean;
  freezeThresholdF: number;
  humidityThreshold: number;
  rateChangeF: number;
  outageHours: number;
  email: string | null;
  channelEmail: boolean;
  channelSms: boolean;
  channelDiscord: boolean;
  channelPush: boolean;
  channelWebhook: boolean;
  discordWebhookUrl: string | null;
  smsPhone: string | null;
  outboundWebhookUrl: string | null;
  outboundWebhookSecret: string | null;
  lastAlertSentAt: string | null;
  lastOutageAlertAt: string | null;
  lastRateAlertAt: string | null;
};

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  enabled: false,
  digestEnabled: false,
  freezeThresholdF: 34,
  humidityThreshold: 75,
  rateChangeF: 15,
  outageHours: 2,
  email: null,
  channelEmail: true,
  channelSms: false,
  channelDiscord: false,
  channelPush: false,
  channelWebhook: false,
  discordWebhookUrl: null,
  smsPhone: null,
  outboundWebhookUrl: null,
  outboundWebhookSecret: null,
  lastAlertSentAt: null,
  lastOutageAlertAt: null,
  lastRateAlertAt: null,
};

/** Minimum time between threshold alert notifications for the same account. */
export const ALERT_COOLDOWN_MS = 4 * 60 * 60 * 1000;

export function getAlertSettingsFromMetadata(
  metadata: Record<string, unknown> | undefined,
): AlertSettings {
  if (!metadata?.alert_settings || typeof metadata.alert_settings !== "object") {
    return DEFAULT_ALERT_SETTINGS;
  }

  const raw = metadata.alert_settings as Record<string, unknown>;

  return {
    ...DEFAULT_ALERT_SETTINGS,
    enabled: raw.enabled === true,
    digestEnabled: raw.digest_enabled === true,
    freezeThresholdF:
      typeof raw.freeze_threshold_f === "number"
        ? raw.freeze_threshold_f
        : DEFAULT_ALERT_SETTINGS.freezeThresholdF,
    humidityThreshold:
      typeof raw.humidity_threshold === "number"
        ? raw.humidity_threshold
        : DEFAULT_ALERT_SETTINGS.humidityThreshold,
    rateChangeF:
      typeof raw.rate_change_f === "number"
        ? raw.rate_change_f
        : DEFAULT_ALERT_SETTINGS.rateChangeF,
    outageHours:
      typeof raw.outage_hours === "number"
        ? raw.outage_hours
        : DEFAULT_ALERT_SETTINGS.outageHours,
    email: typeof raw.email === "string" ? raw.email : null,
    lastAlertSentAt:
      typeof raw.last_alert_sent_at === "string" ? raw.last_alert_sent_at : null,
  };
}

export function rowToAlertSettings(row: Record<string, unknown> | null | undefined): AlertSettings {
  if (!row) return DEFAULT_ALERT_SETTINGS;

  return {
    enabled: row.enabled === true,
    digestEnabled: row.digest_enabled === true,
    freezeThresholdF:
      typeof row.freeze_threshold_f === "number"
        ? row.freeze_threshold_f
        : DEFAULT_ALERT_SETTINGS.freezeThresholdF,
    humidityThreshold:
      typeof row.humidity_threshold === "number"
        ? row.humidity_threshold
        : DEFAULT_ALERT_SETTINGS.humidityThreshold,
    rateChangeF:
      typeof row.rate_change_f === "number"
        ? row.rate_change_f
        : DEFAULT_ALERT_SETTINGS.rateChangeF,
    outageHours:
      typeof row.outage_hours === "number"
        ? row.outage_hours
        : DEFAULT_ALERT_SETTINGS.outageHours,
    email: typeof row.email === "string" ? row.email : null,
    channelEmail: row.channel_email !== false,
    channelSms: row.channel_sms === true,
    channelDiscord: row.channel_discord === true,
    channelPush: row.channel_push === true,
    channelWebhook: row.channel_webhook === true,
    discordWebhookUrl:
      typeof row.discord_webhook_url === "string" ? row.discord_webhook_url : null,
    smsPhone: typeof row.sms_phone === "string" ? row.sms_phone : null,
    outboundWebhookUrl:
      typeof row.outbound_webhook_url === "string" ? row.outbound_webhook_url : null,
    outboundWebhookSecret:
      typeof row.outbound_webhook_secret === "string"
        ? row.outbound_webhook_secret
        : null,
    lastAlertSentAt:
      typeof row.last_alert_sent_at === "string" ? row.last_alert_sent_at : null,
    lastOutageAlertAt:
      typeof row.last_outage_alert_at === "string" ? row.last_outage_alert_at : null,
    lastRateAlertAt:
      typeof row.last_rate_alert_at === "string" ? row.last_rate_alert_at : null,
  };
}

export function isAlertCooldownActive(
  settingsOrLastSent: AlertSettings | string | null | undefined,
  now = Date.now(),
): boolean {
  const lastSentAt =
    typeof settingsOrLastSent === "string" ||
    settingsOrLastSent == null
      ? settingsOrLastSent
      : settingsOrLastSent.lastAlertSentAt;

  if (!lastSentAt) return false;
  const lastSent = Date.parse(lastSentAt);
  if (Number.isNaN(lastSent)) return false;
  return now - lastSent < ALERT_COOLDOWN_MS;
}

export type AlertReading = {
  label: string;
  tempf: number;
  humidity: number;
  sensorId?: string;
};

export function evaluateAlerts(
  settings: AlertSettings,
  readings: AlertReading[],
): string[] {
  if (!settings.enabled) {
    return [];
  }

  const messages: string[] = [];

  for (const reading of readings) {
    if (reading.tempf <= settings.freezeThresholdF) {
      messages.push(
        `${reading.label} is ${reading.tempf.toFixed(1)}°F (at or below freeze threshold ${settings.freezeThresholdF}°F).`,
      );
    }

    if (reading.humidity >= settings.humidityThreshold) {
      messages.push(
        `${reading.label} humidity is ${reading.humidity.toFixed(0)}% (above threshold ${settings.humidityThreshold}%).`,
      );
    }
  }

  return messages;
}

export function evaluateRateChange(
  settings: AlertSettings,
  label: string,
  valuesOldestToNewest: number[],
): string | null {
  if (!settings.enabled || valuesOldestToNewest.length < 2) return null;
  const first = valuesOldestToNewest[0];
  const last = valuesOldestToNewest[valuesOldestToNewest.length - 1];
  const delta = last - first;
  if (Math.abs(delta) >= settings.rateChangeF) {
    return `${label} changed ${delta > 0 ? "+" : ""}${delta.toFixed(1)}°F in the last hour (threshold ±${settings.rateChangeF}°F).`;
  }
  return null;
}

export function evaluateOutage(
  settings: AlertSettings,
  deviceName: string,
  lastSeenAt: string | null,
  now = Date.now(),
): string | null {
  if (!settings.enabled) return null;
  if (!lastSeenAt) {
    return `${deviceName} has never reported a reading.`;
  }
  const last = Date.parse(lastSeenAt);
  if (Number.isNaN(last)) return null;
  const hours = (now - last) / (60 * 60 * 1000);
  if (hours >= settings.outageHours) {
    return `${deviceName} has been silent for ${hours.toFixed(1)} hours (outage threshold ${settings.outageHours}h).`;
  }
  return null;
}

export function serializeAlertSettings(settings: AlertSettings): Record<string, unknown> {
  return {
    enabled: settings.enabled,
    digest_enabled: settings.digestEnabled,
    freeze_threshold_f: settings.freezeThresholdF,
    humidity_threshold: settings.humidityThreshold,
    rate_change_f: settings.rateChangeF,
    outage_hours: settings.outageHours,
    email: settings.email,
    channel_email: settings.channelEmail,
    channel_sms: settings.channelSms,
    channel_discord: settings.channelDiscord,
    channel_push: settings.channelPush,
    channel_webhook: settings.channelWebhook,
    discord_webhook_url: settings.discordWebhookUrl,
    sms_phone: settings.smsPhone,
    outbound_webhook_url: settings.outboundWebhookUrl,
    outbound_webhook_secret: settings.outboundWebhookSecret,
    last_alert_sent_at: settings.lastAlertSentAt,
    last_outage_alert_at: settings.lastOutageAlertAt,
    last_rate_alert_at: settings.lastRateAlertAt,
  };
}

export function alertSettingsToRow(settings: AlertSettings): Record<string, unknown> {
  return {
    enabled: settings.enabled,
    digest_enabled: settings.digestEnabled,
    freeze_threshold_f: settings.freezeThresholdF,
    humidity_threshold: settings.humidityThreshold,
    rate_change_f: settings.rateChangeF,
    outage_hours: settings.outageHours,
    email: settings.email,
    channel_email: settings.channelEmail,
    channel_sms: settings.channelSms,
    channel_discord: settings.channelDiscord,
    channel_push: settings.channelPush,
    channel_webhook: settings.channelWebhook,
    discord_webhook_url: settings.discordWebhookUrl,
    sms_phone: settings.smsPhone,
    outbound_webhook_url: settings.outboundWebhookUrl,
    outbound_webhook_secret: settings.outboundWebhookSecret,
    last_alert_sent_at: settings.lastAlertSentAt,
    last_outage_alert_at: settings.lastOutageAlertAt,
    last_rate_alert_at: settings.lastRateAlertAt,
    updated_at: new Date().toISOString(),
  };
}
