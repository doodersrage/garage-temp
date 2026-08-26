import {
  type AlertChannelName,
  type AlertSettings,
  type NotifyKind,
  alertSettingsToRow,
  getAlertSettingsFromMetadata,
  rowToAlertSettings,
} from "./alerts";
import { recordAlertEvent } from "./alertEvents";
import {
  quietHoursAllowsSmsCritical,
  shouldSuppressForQuietHours,
} from "./quietHours";
import { shouldSuppressForSnoozeOrVacation } from "./alertSnooze";
import { applyAlertTemplates } from "./alertTemplates";
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

async function sendTwilioSms(to: string, body: string): Promise<void> {
  const sid = import.meta.env.TWILIO_ACCOUNT_SID;
  const token = import.meta.env.TWILIO_AUTH_TOKEN;
  const from = import.meta.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    console.warn("Twilio env vars not configured; skipping SMS");
    return;
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
    }
  } catch (error) {
    console.error("Failed to send Twilio SMS:", error);
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
  url: string,
  secret: string | null,
  payload: NotifyPayload,
): Promise<void> {
  try {
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

    await fetch(url, { method: "POST", headers, body });
  } catch (error) {
    console.error("Failed to send outbound webhook:", error);
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
    | "last_rssi_alert_at",
): Promise<void> {
  const supabase = createServerClient();
  await supabase
    .from("alert_settings")
    .update({ [field]: new Date().toISOString(), updated_at: new Date().toISOString() })
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
  options?: { snoozeUrl?: string; smsOnly?: boolean },
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
  const bodyWithSnooze = options?.snoozeUrl
    ? `${payloadResolved.body}\n\nSnooze 24h: ${options.snoozeUrl}`
    : payloadResolved.body;
  const allowChannel = (channel: AlertChannelName) => {
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
      await sendTwilioSms(settings.smsPhone, `${payloadResolved.title}: ${bodyWithSnooze}`);
      sent.push("sms");
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
