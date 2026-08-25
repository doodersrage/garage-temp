import { createAdminClient } from "./supabase";
import type { ChartPoint } from "./garageTempsHistory";
import { getAlertSettingsForUser, notifyUser } from "./notify";
import { listAllHouseholdOwnerUserIds } from "./households";
import { summarizeSeasonal } from "./seasonalInsights";

async function sendDigestEmail(to: string, subject: string, body: string): Promise<void> {
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
    console.error("Failed to send digest email:", error);
  }
}

function summarizePoints(points: ChartPoint[]): string[] {
  const byProbe = new Map<string, ChartPoint[]>();

  for (const point of points) {
    const group = byProbe.get(point.probeLabel) ?? [];
    group.push(point);
    byProbe.set(point.probeLabel, group);
  }

  const lines: string[] = [];

  for (const [label, probePoints] of byProbe) {
    const temps = probePoints.map((point) => point.tempf);
    const humidities = probePoints.map((point) => point.humidity);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const avgHumidity =
      humidities.reduce((sum, value) => sum + value, 0) / humidities.length;

    lines.push(
      `${label}: ${min.toFixed(1)}–${max.toFixed(1)} °F, avg humidity ${avgHumidity.toFixed(0)}% (${probePoints.length} readings)`,
    );
  }

  return lines;
}

export async function sendWeeklyDigestsForAllUsers(): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
}> {
  const admin = createAdminClient();
  const errors: string[] = [];
  let sent = 0;
  let skipped = 0;

  const userIds = await listAllHouseholdOwnerUserIds();

  for (const userId of userIds) {
    try {
      const { data: userData } = await admin.auth.admin.getUserById(userId);
      const user = userData.user;
      if (!user?.email) {
        skipped += 1;
        continue;
      }

      const settings = await getAlertSettingsForUser(
        userId,
        user.user_metadata as Record<string, unknown> | undefined,
      );

      if (!settings.digestEnabled) {
        skipped += 1;
        continue;
      }

      const digestEmail = settings.email ?? user.email;
      const { fetchGarageTempChartData } = await import("./garageTempsHistory");
      const chart = await fetchGarageTempChartData(userId, 7);

      if (chart.error) {
        errors.push(`${user.email}: ${chart.error}`);
        continue;
      }

      const points = chart.points;
      if (!points || points.length === 0) {
        skipped += 1;
        continue;
      }

      const summary = summarizePoints(points);
      const seasonal = summarizeSeasonal(points, 7);
      const body = [
        "Weekly garage temperature summary (last 7 days)",
        "",
        ...summary,
        "",
        "Seasonal highlights:",
        ...seasonal.map((item) => `- ${item.title}: ${item.detail}`),
        "",
        "Manage digest settings in your dashboard.",
      ].join("\n");

      await sendDigestEmail(digestEmail, "Weekly garage temperature digest", body);

      // Also fan out to other digest-capable channels if enabled
      await notifyUser(userId, digestEmail, { ...settings, channelEmail: false }, {
        title: "Weekly garage digest",
        body: summary.join("\n"),
        kind: "digest",
      });

      sent += 1;
    } catch (e) {
      errors.push(
        `${userId}: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  }

  return { sent, skipped, errors };
}

export function shouldSendWeeklyDigest(now = new Date()): boolean {
  return now.getUTCDay() === 1 && now.getUTCHours() === 8;
}
