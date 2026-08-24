import type { ChartPoint } from "./garageTempsHistory";
import { createAdminClient, createServerClient } from "./supabase";
import { getAlertSettingsFromMetadata } from "./alerts";

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
  const supabase = createServerClient();
  const admin = createAdminClient();
  const errors: string[] = [];
  let sent = 0;
  let skipped = 0;

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data: feedRows, error } = await supabase
    .from("user_temp_feeds")
    .select("user_id")
    .order("user_id");

  if (error) {
    return { sent: 0, skipped: 0, errors: [error.message] };
  }

  const userIds = [...new Set((feedRows ?? []).map((row) => row.user_id))];

  for (const userId of userIds) {
    try {
      const { data: userData } = await admin.auth.admin.getUserById(userId);
      const user = userData.user;
      if (!user?.email) {
        skipped += 1;
        continue;
      }

      const settings = getAlertSettingsFromMetadata(
        user.user_metadata as Record<string, unknown> | undefined,
      );

      if (!settings.enabled) {
        skipped += 1;
        continue;
      }

      const digestEmail = settings.email ?? user.email;
      const { data: rows, error: historyError } = await supabase
        .from("garage_temps")
        .select("tempf, humidity, timestamp, probe_label, probe_key")
        .eq("user_id", userId)
        .gte("timestamp", since.toISOString())
        .order("timestamp", { ascending: true });

      if (historyError) {
        errors.push(`${user.email}: ${historyError.message}`);
        continue;
      }

      if (!rows || rows.length === 0) {
        skipped += 1;
        continue;
      }

      const points: ChartPoint[] = rows.map((row) => ({
        timestamp: row.timestamp,
        tempf: Number(row.tempf),
        humidity: Number(row.humidity),
        probeLabel: row.probe_label?.trim() || row.probe_key || "Probe",
      }));

      const summary = summarizePoints(points);
      const body = [
        "Weekly garage temperature summary (last 7 days)",
        "",
        ...summary,
        "",
        "Manage alert settings in your dashboard.",
      ].join("\n");

      await sendDigestEmail(digestEmail, "Weekly garage temperature digest", body);
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
