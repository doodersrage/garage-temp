import { createAdminClient } from "./supabase";
import { resolveSiteUrl } from "./schemaMarkup";

type DripStage = {
  day: number;
  subject: string;
  body: (siteUrl: string) => string;
};

const DRIP_STAGES: DripStage[] = [
  {
    day: 1,
    subject: "Add your first probe to Garage Temp",
    body: (site) =>
      [
        "Welcome to Garage Temp!",
        "",
        "Next step: add a push device or JSON feed so live readings appear on your dashboard.",
        `${site}/dashboard/temperature`,
        "",
        "Need wiring help? See the About guides for Arduino and ESP32 setup.",
      ].join("\n"),
  },
  {
    day: 3,
    subject: "Turn on freeze alerts before the next cold snap",
    body: (site) =>
      [
        "Garage Temp can email or message you when temperatures drop toward freezing.",
        "",
        "Set a threshold under Alerts — most users start around 34°F.",
        `${site}/dashboard/alerts`,
      ].join("\n"),
  },
  {
    day: 7,
    subject: "Try Pro free — SMS, push, and share links",
    body: (site) =>
      [
        "You've had a week to explore Garage Temp.",
        "",
        "Pro adds SMS and browser push alerts, public share links, webhooks, and up to 24 devices — with a 14-day trial.",
        `${site}/pricing`,
      ].join("\n"),
  },
];

async function sendPlainEmail(to: string, subject: string, body: string): Promise<void> {
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

  await env.MAILER.send(
    new EmailMessage(import.meta.env.SMTP_MAIL_FROM, to, msg.asRaw()),
  );
}

export async function sendDripEmailsForAllUsers(): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
}> {
  const admin = createAdminClient();
  const siteUrl = resolveSiteUrl(null);
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  const { data: settingsRows } = await admin
    .from("alert_settings")
    .select("user_id, drip_emails_enabled, drip_email_stage, last_drip_email_at")
    .eq("drip_emails_enabled", true);

  for (const row of settingsRows ?? []) {
    try {
      const { data: userData } = await admin.auth.admin.getUserById(row.user_id);
      const user = userData.user;
      if (!user?.email || !user.created_at) {
        skipped += 1;
        continue;
      }

      const ageDays = Math.floor(
        (Date.now() - Date.parse(user.created_at)) / (24 * 60 * 60 * 1000),
      );
      const nextStage = DRIP_STAGES.find(
        (stage) => stage.day > (row.drip_email_stage ?? 0) && ageDays >= stage.day,
      );
      if (!nextStage) {
        skipped += 1;
        continue;
      }

      if (row.last_drip_email_at) {
        const hoursSince = (Date.now() - Date.parse(row.last_drip_email_at)) / (60 * 60 * 1000);
        if (hoursSince < 20) {
          skipped += 1;
          continue;
        }
      }

      await sendPlainEmail(user.email, nextStage.subject, nextStage.body(siteUrl));
      await admin
        .from("alert_settings")
        .update({
          drip_email_stage: nextStage.day,
          last_drip_email_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", row.user_id);
      sent += 1;
    } catch (error) {
      errors.push(
        `${row.user_id}: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }

  return { sent, skipped, errors };
}
