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
import { createServerClient } from "./supabase";
import { getUserEntitlements } from "./entitlements";

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

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function sendWebPushToUser(userId: string, payload: NotifyPayload): Promise<void> {
  const publicKey = import.meta.env.VAPID_PUBLIC_KEY;
  const privateKey = import.meta.env.VAPID_PRIVATE_KEY;
  const subject = import.meta.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

  if (!publicKey || !privateKey) {
    console.warn("VAPID keys not configured; skipping web push");
    return;
  }

  const supabase = createServerClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return;

  try {
    const { buildPushPayload } = await import("@block65/webcrypto-web-push");

    for (const sub of subs) {
      try {
        const pushPayload = await buildPushPayload(
          {
            data: JSON.stringify({ title: payload.title, body: payload.body }),
            options: { ttl: 60 * 60 },
          },
          {
            endpoint: sub.endpoint,
            expirationTime: null,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          {
            subject,
            publicKey,
            privateKey,
          },
        );

        await fetch(sub.endpoint, pushPayload);
      } catch (error) {
        console.error("Web push send failed:", error);
      }
    }
  } catch {
    void base64UrlToUint8Array;
    console.warn("webcrypto-web-push not available; skipping encrypted web push");
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
    | "last_forecast_alert_at",
): Promise<void> {
  const supabase = createServerClient();
  await supabase
    .from("alert_settings")
    .update({ [field]: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

export async function notifyUser(
  userId: string,
  fallbackEmail: string | null | undefined,
  settings: AlertSettings,
  payload: NotifyPayload,
): Promise<{ sent: string[]; skipped: string[] }> {
  const smsCriticalOnly = quietHoursAllowsSmsCritical(settings, payload.kind);
  if (shouldSuppressForQuietHours(settings, payload.kind) && !smsCriticalOnly) {
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
  const sent: string[] = [];
  const skipped: string[] = [];
  const kind = payload.kind;
  const allowChannel = (channel: AlertChannelName) => {
    if (smsCriticalOnly) return channel === "sms";
    return channelAllowed(settings, kind, channel);
  };

  if (settings.channelEmail && allowChannel("email")) {
    if (email) {
      await sendEmail(email, payload.title, payload.body);
      sent.push("email");
    } else {
      skipped.push("email");
    }
  }

  if (settings.channelDiscord && allowChannel("discord")) {
    if (settings.discordWebhookUrl) {
      await sendDiscord(settings.discordWebhookUrl, payload.title, payload.body);
      sent.push("discord");
    } else {
      skipped.push("discord");
    }
  }

  if (settings.channelSlack && allowChannel("slack")) {
    if (settings.slackWebhookUrl) {
      await sendSlack(settings.slackWebhookUrl, payload.title, payload.body);
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
        payload.title,
        payload.body,
      );
      sent.push("telegram");
    } else {
      skipped.push("telegram");
    }
  }

  if (settings.channelSms && allowChannel("sms")) {
    if (settings.smsPhone && entitlements.canUseSms) {
      await sendTwilioSms(settings.smsPhone, `${payload.title}: ${payload.body}`);
      sent.push("sms");
    } else {
      skipped.push("sms");
    }
  }

  if (settings.channelPush && allowChannel("push")) {
    if (entitlements.canUsePush) {
      await sendWebPushToUser(userId, payload);
      sent.push("push");
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
