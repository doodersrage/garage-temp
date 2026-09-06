/** Human-readable labels for alert delivery channels and skip reasons. */
export const ALERT_CHANNEL_LABELS: Record<string, string> = {
  email: "email",
  discord: "Discord",
  telegram: "Telegram",
  slack: "Slack",
  teams: "Teams",
  sms: "SMS",
  whatsapp: "WhatsApp",
  push: "browser push",
  pushover: "Pushover",
  ntfy: "ntfy",
  webhook: "webhook",
  quiet_hours: "quiet hours",
  snoozed: "snoozed",
  vacation: "vacation mode",
  disabled: "alerts off",
  incomplete: "missing destination",
  not_entitled: "plan upgrade required",
  push_not_configured: "push (VAPID keys missing on server)",
  push_no_subscription: "push (subscribe this browser first)",
  push_delivery_failed: "push (delivery failed: re-subscribe)",
  push_load_failed: "push (could not load subscriptions)",
  push_send_failed: "push (send error)",
  sms_not_configured: "SMS (Twilio not configured on server)",
  channel_filter: "filtered by routing rules",
  severity_filter: "filtered by severity routing",
};

export function formatAlertChannelList(channels: string[]): string {
  return channels
    .map((key) => ALERT_CHANNEL_LABELS[key] ?? key.replaceAll("_", " "))
    .join(", ");
}

export function formatAlertChannelsCsv(raw: string | null | undefined): string {
  if (!raw) return "";
  return formatAlertChannelList(raw.split(",").filter(Boolean));
}

/** Ops / Alerts smoke-test flash copy for skip and failure codes. */
export function channelTestErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  if (code === "sms_no_phone") {
    return "No SMS phone on alert settings or the override field.";
  }
  if (code === "sms_send_failed") {
    return "Twilio SMS send failed. Check Twilio credentials and the destination number.";
  }
  if (code === "unknown_kind") {
    return "Unknown channel test kind.";
  }
  return ALERT_CHANNEL_LABELS[code] ?? code.replaceAll("_", " ");
}
