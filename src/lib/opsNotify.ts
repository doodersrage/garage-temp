/** Operator notifications for failed background jobs. */

function cleanEnv(value: unknown): string {
  return String(value ?? "").replace(/\r/g, "").trim();
}

async function sendOpsEmail(subject: string, body: string): Promise<boolean> {
  const to = cleanEnv(import.meta.env.SMTP_MAIL_TO);
  const from = cleanEnv(import.meta.env.SMTP_MAIL_FROM);
  if (!to || !from) return false;

  try {
    const { EmailMessage } = await import("cloudflare:email");
    const { createMimeMessage } = await import("mimetext");
    const { env } = await import("cloudflare:workers");

    const msg = createMimeMessage();
    msg.setSender({ name: "Garage Temp Ops", addr: from });
    msg.setRecipient(to);
    msg.setSubject(subject);
    msg.addMessage({ contentType: "text/plain", data: body });

    await env.MAILER.send(new EmailMessage(from, to, msg.asRaw()));
    return true;
  } catch (error) {
    console.error("Failed to send ops email:", error);
    return false;
  }
}

async function sendOpsDiscord(title: string, body: string): Promise<boolean> {
  const webhook =
    cleanEnv(import.meta.env.OPS_DISCORD_WEBHOOK_URL) ||
    cleanEnv(import.meta.env.DISCORD_OPS_WEBHOOK_URL);
  if (!webhook) return false;

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `**${title}**\n${body}`.slice(0, 1900) }),
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to send ops Discord webhook:", error);
    return false;
  }
}

export async function notifyOps(title: string, body: string): Promise<void> {
  const [emailOk, discordOk] = await Promise.all([
    sendOpsEmail(title, body),
    sendOpsDiscord(title, body),
  ]);

  if (!emailOk && !discordOk) {
    console.error(`Ops notify skipped (no channel configured): ${title} — ${body}`);
  }
}

export function formatJobFailureBody(
  jobName: string,
  details: Record<string, unknown> | null | undefined,
): string {
  const lines = [
    `Job: ${jobName}`,
    `Time: ${new Date().toISOString()}`,
  ];

  if (details && typeof details === "object") {
    const message = details.message;
    if (typeof message === "string" && message) {
      lines.push(`Message: ${message}`);
    }
    const errors = details.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      lines.push("Errors:");
      for (const err of errors.slice(0, 10)) {
        lines.push(`- ${String(err)}`);
      }
    }
    const rolled = JSON.stringify(details);
    if (rolled.length < 1500) {
      lines.push(`Details: ${rolled}`);
    }
  }

  return lines.join("\n");
}
