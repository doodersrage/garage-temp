import { createAdminClient } from "./supabase";
import { resolveSiteUrl } from "./schemaMarkup";
import {
  brandedEmailParts,
  type BrandedEmailContent,
} from "./emailLayout";
import {
  isMailerRecipientNotAllowed,
  partitionMailErrors,
  sendEmail,
} from "./mailer";

export type DripStageId = "day1" | "day3" | "day7";

type DripStage = {
  id: DripStageId;
  day: number;
  subject: string;
  content: (siteUrl: string) => BrandedEmailContent;
};

export const DRIP_STAGES: DripStage[] = [
  {
    id: "day1",
    day: 1,
    subject: "Add your first probe to ThermalTrace",
    content: (site) => ({
      eyebrow: "Getting started",
      preheader: "Connect a device or JSON feed so live readings show up on your dashboard.",
      title: "Add your first probe",
      intro:
        "Welcome to ThermalTrace. Your account is ready — the next step is getting live temperature into the dashboard.",
      paragraphs: [
        "Create a push device (ESP/Arduino) or add an HTTPS JSON feed. Once readings arrive, Home and History light up automatically.",
      ],
      bullets: [
        "Push ingest: Dashboard → Devices → create a device key",
        "Pull feeds: paste a HTTPS JSON URL and map probe labels",
        "About guides cover DHT22 wiring, Arduino sketches, and ESP OTA",
      ],
      cta: { label: "Open Devices", url: `${site}/dashboard/temperature` },
      secondaryCta: { label: "Browse setup guides", url: `${site}/about` },
      tone: "brand",
    }),
  },
  {
    id: "day3",
    day: 3,
    subject: "Turn on freeze alerts before the next cold snap",
    content: (site) => ({
      eyebrow: "Freeze protection",
      preheader: "Most garages start alerts around 34°F so you get warning before pipes freeze.",
      title: "Don’t wait for the cold snap",
      intro:
        "ThermalTrace can reach you when temperatures drop toward freezing — email now, plus SMS and push on Pro.",
      paragraphs: [
        "Set a freeze threshold on your coldest zone, enable the channels you actually check, and send a test while you’re awake.",
      ],
      bullets: [
        "Start near 34–38°F, then tune after you see overnight lows",
        "Enable quiet-hour bypass for freeze alerts",
        "Optional: invite household members so someone else sees the ping",
      ],
      cta: { label: "Configure alerts", url: `${site}/dashboard/alerts` },
      secondaryCta: { label: "Cold-snap playbook", url: `${site}/about/cold-snap-playbook` },
      tone: "alert",
    }),
  },
  {
    id: "day7",
    day: 7,
    subject: "Try Pro free — SMS, push, and share links",
    content: (site) => ({
      eyebrow: "Pro trial",
      preheader: "SMS, browser push, share links, and webhooks — 14-day free trial.",
      title: "Level up with a free Pro trial",
      intro:
        "You’ve had a week to explore ThermalTrace. Pro adds the channels and sharing tools that matter at 2 a.m.",
      paragraphs: [
        "Start a 14-day trial from Pricing — cancel anytime from the dashboard billing portal.",
      ],
      bullets: [
        "SMS and browser push freeze alerts",
        "Public share links and embed widgets",
        "Outbound webhooks plus up to 24 devices",
      ],
      cta: { label: "Compare plans & start trial", url: `${site}/pricing` },
      secondaryCta: { label: "Open dashboard", url: `${site}/dashboard` },
      tone: "brand",
    }),
  },
];

export function buildDripEmail(
  stageId: DripStageId,
  siteUrl = resolveSiteUrl(null),
): { subject: string; text: string; html: string } {
  const stage = DRIP_STAGES.find((item) => item.id === stageId) ?? DRIP_STAGES[0];
  const parts = brandedEmailParts(stage.content(siteUrl));
  return { subject: stage.subject, ...parts };
}

export async function sendDripEmailsForAllUsers(): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
  restricted: number;
}> {
  const admin = createAdminClient();
  const siteUrl = resolveSiteUrl(null);
  let sent = 0;
  let skipped = 0;
  let restricted = 0;
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

      const mail = buildDripEmail(nextStage.id, siteUrl);
      await sendEmail(user.email, mail.subject, mail.text, { html: mail.html });
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
      if (isMailerRecipientNotAllowed(error)) {
        // Cloudflare Email binding is destination-restricted; do not fail the cron.
        restricted += 1;
        errors.push(
          `${row.user_id}: ${error instanceof Error ? error.message : "recipient not allowed"}`,
        );
        continue;
      }
      errors.push(
        `${row.user_id}: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }

  return { sent, skipped, errors, restricted };
}

export function dripJobShouldFail(errors: string[]): boolean {
  return partitionMailErrors(errors).hardErrors.length > 0;
}
