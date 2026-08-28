import {
  type AlertChannelName,
  type AlertSettings,
  type NotifyKind,
  alertSettingsToRow,
  getAlertSettingsFromMetadata,
  rowToAlertSettings,
} from "./alerts";
import { recordAlertEvent } from "./alertEvents";
import { applyAlertTemplates } from "./alertTemplates";
import {
  quietHoursAllowsSmsCritical,
  shouldSuppressForQuietHours,
} from "./quietHours";
import { shouldSuppressForSnoozeOrVacation } from "./alertSnooze";
import { filterChannelsForSpace } from "./spaceChannelRouting";
import { deliverWebhookPost } from "./webhookDeliveries";
import { createServerClient } from "./supabase";
import { getUserEntitlements } from "./entitlements";
import { sendWebPushToUser } from "./webPush";

export type NotifyPayload = {
  title: string;
  body: string;
  kind?: NotifyKind;
};

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  try {
    const { sendPlainEmail } = await import("./mailer");
    await sendPlainEmail(to, subject, body);
  } catch (error) {
    console.error("Failed to send alert email:", error);
  }
}

async function sendDiscord(webhookUrl: string, title: string, body: string): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `**${title}**\n${body}`,
      }),
    });
  } catch (error) {
    console.error("Failed to send Discord webhook:", error);
  }
}

async function sendSlack(webhookUrl: string, title: string, body: string): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `*${title}*\n${body}`,
      }),
    });
  } catch (error) {
    console.error("Failed to send Slack webhook:", error);
  }
}

async function sendTeams(webhookUrl: string, title: string, body: string): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "@type": "MessageCard",
        summary: title,
        themeColor: "0078D4",
        title,
        text: body,
      }),
    });
  } catch (error) {
    console.error("Failed to send Teams webhook:", error);
  }
}

async function sendNtfy(
  server: string,
  topic: string,
  title: string,
  body: string,
): Promise<void> {
  try {
    const base = server.replace(/\/$/, "");
    await fetch(`${base}/${encodeURIComponent(topic)}`, {
      method: "POST",
      headers: {
        Title: title.slice(0, 250),
        Priority: "high",
        Tags: "thermometer",
      },
      body: `${title}\n${body}`.slice(0, 4000),
    });
  } catch (error) {
    console.error("Failed to send ntfy notification:", error);
  }
}

async function sendPushover(
  userKey: string,
  appToken: string,
  title: string,
  body: string,
): Promise<void> {
  try {
    const params = new URLSearchParams({
      token: appToken,
      user: userKey,
      title: title.slice(0, 250),
      message: body.slice(0, 1024),
      priority: "1",
    });
    await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
  } catch (error) {
    console.error("Failed to send Pushover notification:", error);
  }
}

export async function sendTwilioWhatsApp(to: string, body: string): Promise<boolean> {
  const sid = import.meta.env.TWILIO_ACCOUNT_SID?.trim();
  const token = import.meta.env.TWILIO_AUTH_TOKEN?.trim();
  const from =
    import.meta.env.TWILIO_WHATSAPP_FROM?.trim() ||
    import.meta.env.TWILIO_FROM_NUMBER?.trim();

  if (!sid || !token || !from) {
    console.warn("Twilio WhatsApp env vars not configured; skipping");
    return false;
  }

  const whatsappFrom = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
  const whatsappTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  try {
    const auth = btoa(`${sid}:${token}`);
    const params = new URLSearchParams({
      To: whatsappTo,
      From: whatsappFrom,
      Body: body.slice(0, 1500),
    });
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      },
    );
    if (!response.ok) {
      console.error("Twilio WhatsApp failed:", await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to send Twilio WhatsApp:", error);
    return false;
  }
}

async function sendTelegram(
  botToken: string,
  chatId: string,
  title: string,
  body: string,
): Promise<void> {
  try {
    const url = `https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `${title}\n${body}`.slice(0, 4000),
      }),
    });
    if (!response.ok) {
      console.error("Telegram send failed:", await response.text());
    }
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
  }
}

export function isTwilioConfigured(): boolean {
  return Boolean(
    import.meta.env.TWILIO_ACCOUNT_SID?.trim() &&
      import.meta.env.TWILIO_AUTH_TOKEN?.trim() &&
      import.meta.env.TWILIO_FROM_NUMBER?.trim(),
  );
}

export async function sendTwilioSms(to: string, body: string): Promise<boolean> {
  const sid = import.meta.env.TWILIO_ACCOUNT_SID?.trim();
  const token = import.meta.env.TWILIO_AUTH_TOKEN?.trim();
  const from = import.meta.env.TWILIO_FROM_NUMBER?.trim();

  if (!sid || !token || !from) {
    console.warn("Twilio env vars not configured; skipping SMS");
    return false;
  }

  try {
    const auth = btoa(`${sid}:${token}`);
    const params = new URLSearchParams({
      To: to,
      From: from,
      Body: body.slice(0, 1500),
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      },
    );

    if (!response.ok) {
      console.error("Twilio SMS failed:", await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to send Twilio SMS:", error);
    return false;
  }
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendOutboundWebhook(
  userId: string,
  url: string,
  secret: string | null,
  payload: NotifyPayload,
): Promise<void> {
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    kind: payload.kind ?? "generic",
    sent_at: new Date().toISOString(),
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (secret) {
    headers["X-Signature"] = await hmacSha256Hex(secret, body);
  }

  const response = await deliverWebhookPost(
    userId,
    "outbound_alert",
    url,
    headers,
    body,
  );
  if (response && !response.ok) {
    console.error("Outbound webhook failed:", response.status);
  }
}

function channelAllowed(
  settings: AlertSettings,
  kind: NotifyKind | undefined,
  channel: AlertChannelName,
): boolean {
  if (!kind) return true;
  const override = settings.channelSeverity?.[kind];
  if (!override || override.length === 0) return true;
  return override.includes(channel);
}

export async function getAlertSettingsForUser(
  userId: string,
  metadata?: Record<string, unknown>,
): Promise<AlertSettings> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("alert_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (data) {
    return rowToAlertSettings(data as Record<string, unknown>);
  }

  const fromMeta = getAlertSettingsFromMetadata(metadata);
  await supabase.from("alert_settings").upsert({
    user_id: userId,
    ...alertSettingsToRow(fromMeta),
  });

  return fromMeta;
}

export async function saveAlertSettingsForUser(
  userId: string,
  settings: AlertSettings,
): Promise<{ error: string | null }> {
  const supabase = createServerClient();
  const { error } = await supabase.from("alert_settings").upsert({
    user_id: userId,
    ...alertSettingsToRow(settings),
  });

  return { error: error?.message ?? null };
}

export async function markCooldown(
  userId: string,
  field:
    | "last_alert_sent_at"
    | "last_outage_alert_at"
    | "last_rate_alert_at"
    | "last_forecast_alert_at"
    | "last_battery_alert_at"
    | "last_battery_trend_alert_at"
    | "last_rssi_alert_at"
    | "last_nws_alert_at",
): Promise<void> {
  const supabase = createServerClient();
  const now = new Date().toISOString();
  await supabase
    .from("alert_settings")
    .update({ [field]: now, updated_at: now } as {
      last_alert_sent_at?: string;
      last_outage_alert_at?: string;
      last_rate_alert_at?: string;
      last_forecast_alert_at?: string;
      last_battery_alert_at?: string;
      last_battery_trend_alert_at?: string;
      last_rssi_alert_at?: string;
      last_nws_alert_at?: string;
      updated_at: string;
    })
    .eq("user_id", userId);
}

export async function markEscalation(userId: string): Promise<void> {
  const supabase = createServerClient();
  await supabase
    .from("alert_settings")
    .update({
      last_escalation_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

export async function notifyUser(
  userId: string,
  fallbackEmail: string | null | undefined,
  settings: AlertSettings,
  payload: NotifyPayload,
  options?: { snoozeUrl?: string; smsOnly?: boolean; space?: string | null },
): Promise<{ sent: string[]; skipped: string[] }> {
  if (
    !options?.smsOnly &&
    shouldSuppressForSnoozeOrVacation(settings, payload.kind)
  ) {
    const skipped = ["snooze_or_vacation"];
    await recordAlertEvent({
      userId,
      kind: payload.kind ?? "generic",
      title: payload.title,
      body: payload.body,
      channelsSent: [],
      channelsSkipped: skipped,
    });
    return { sent: [], skipped };
  }

  const smsCriticalOnly =
    options?.smsOnly || quietHoursAllowsSmsCritical(settings, payload.kind);
  if (
    !options?.smsOnly &&
    shouldSuppressForQuietHours(settings, payload.kind) &&
    !smsCriticalOnly
  ) {
    const skipped = ["quiet_hours"];
    await recordAlertEvent({
      userId,
      kind: payload.kind ?? "generic",
      title: payload.title,
      body: payload.body,
      channelsSent: [],
      channelsSkipped: skipped,
    });
    return { sent: [], skipped };
  }

  const entitlements = await getUserEntitlements(userId);
  const email = settings.email ?? fallbackEmail ?? null;
  let payloadResolved = applyAlertTemplates(payload, settings.alertTemplates);
  const sent: string[] = [];
  const skipped: string[] = [];
  const kind = payloadResolved.kind;
  const routedChannels = kind
    ? filterChannelsForSpace(
        settings,
        options?.space,
        kind,
        ["email", "sms", "discord", "push", "webhook", "telegram", "slack", "teams", "ntfy", "pushover", "whatsapp"],
      )
    : null;
  const routedSet = routedChannels ? new Set(routedChannels) : null;
  const bodyWithSnooze = options?.snoozeUrl
    ? `${payloadResolved.body}\n\nSnooze 24h: ${options.snoozeUrl}`
    : payloadResolved.body;
  const allowChannel = (channel: AlertChannelName) => {
    if (routedSet && !routedSet.has(channel)) return false;
    if (options?.smsOnly) return channel === "sms";
    if (smsCriticalOnly) return channel === "sms";
    return channelAllowed(settings, kind, channel);
  };

  if (settings.channelEmail && allowChannel("email")) {
    if (email) {
      await sendEmail(email, payloadResolved.title, bodyWithSnooze);
      sent.push("email");
    } else {
      skipped.push("email");
    }
  }

  if (settings.channelDiscord && allowChannel("discord")) {
    if (settings.discordWebhookUrl) {
      await sendDiscord(settings.discordWebhookUrl, payloadResolved.title, bodyWithSnooze);
      sent.push("discord");
    } else {
      skipped.push("discord");
    }
  }

  if (settings.channelSlack && allowChannel("slack")) {
    if (settings.slackWebhookUrl) {
      await sendSlack(settings.slackWebhookUrl, payloadResolved.title, bodyWithSnooze);
      sent.push("slack");
    } else {
      skipped.push("slack");
    }
  }

  if (settings.channelTeams && allowChannel("teams")) {
    if (settings.teamsWebhookUrl) {
      await sendTeams(settings.teamsWebhookUrl, payloadResolved.title, bodyWithSnooze);
      sent.push("teams");
    } else {
      skipped.push("teams");
    }
  }

  if (settings.channelNtfy && allowChannel("ntfy")) {
    if (settings.ntfyTopic) {
      await sendNtfy(
        settings.ntfyServer,
        settings.ntfyTopic,
        payloadResolved.title,
        bodyWithSnooze,
      );
      sent.push("ntfy");
    } else {
      skipped.push("ntfy");
    }
  }

  if (settings.channelPushover && allowChannel("pushover")) {
    if (settings.pushoverUserKey && settings.pushoverAppToken) {
      await sendPushover(
        settings.pushoverUserKey,
        settings.pushoverAppToken,
        payloadResolved.title,
        bodyWithSnooze,
      );
      sent.push("pushover");
    } else {
      skipped.push("pushover");
    }
  }

  if (settings.channelWhatsapp && allowChannel("whatsapp")) {
    if (settings.whatsappPhone && entitlements.canUseSms) {
      const ok = await sendTwilioWhatsApp(
        settings.whatsappPhone,
        `${payloadResolved.title}: ${bodyWithSnooze}`,
      );
      if (ok) sent.push("whatsapp");
      else skipped.push("whatsapp");
    } else {
      skipped.push("whatsapp");
    }
  }

  if (settings.channelTelegram && allowChannel("telegram")) {
    if (settings.telegramBotToken && settings.telegramChatId) {
      await sendTelegram(
        settings.telegramBotToken,
        settings.telegramChatId,
        payloadResolved.title,
        bodyWithSnooze,
      );
      sent.push("telegram");
    } else {
      skipped.push("telegram");
    }
  }

  if (settings.channelSms && allowChannel("sms")) {
    if (settings.smsPhone && entitlements.canUseSms) {
      const smsOk = await sendTwilioSms(
        settings.smsPhone,
        `${payloadResolved.title}: ${bodyWithSnooze}`,
      );
      if (smsOk) {
        sent.push("sms");
      } else {
        skipped.push(isTwilioConfigured() ? "sms" : "sms_not_configured");
      }
    } else {
      skipped.push("sms");
    }
  }

  if (settings.channelPush && allowChannel("push")) {
    if (entitlements.canUsePush) {
      const pushResult = await sendWebPushToUser(userId, {
        title: payloadResolved.title,
        body: bodyWithSnooze,
      });
      if (pushResult.delivered > 0) {
        sent.push("push");
      } else {
        skipped.push(pushResult.skippedReason ?? "push");
      }
    } else {
      skipped.push("push");
    }
  }

  if (settings.channelWebhook && allowChannel("webhook")) {
    if (settings.outboundWebhookUrl && entitlements.canUseOutboundWebhook) {
      await sendOutboundWebhook(
        userId,
        settings.outboundWebhookUrl,
        settings.outboundWebhookSecret,
        payload,
      );
      sent.push("webhook");
    } else {
      skipped.push("webhook");
    }
  }

  if (smsCriticalOnly && sent.length === 0) {
    skipped.push("quiet_hours");
  }

  await recordAlertEvent({
    userId,
    kind: payload.kind ?? "generic",
    title: payload.title,
    body: payload.body,
    channelsSent: sent,
    channelsSkipped: skipped,
  });

  return { sent, skipped };
}
