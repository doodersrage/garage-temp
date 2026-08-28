/** Shared outbound email via Cloudflare Email binding. */

type MailerBinding = { send: (message: unknown) => Promise<void> };

export function isMailerRecipientNotAllowed(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /not allowed/i.test(message) || /recipient.*not.*allowed/i.test(message);
}

export function requireSmtpMailFrom(): string {
  const from = import.meta.env.SMTP_MAIL_FROM?.trim();
  if (!from) {
    throw new Error("SMTP_MAIL_FROM is not configured");
  }
  return from;
}

/** Send a prebuilt cloudflare:email EmailMessage (avoids SendEmail type mismatch). */
export async function sendMailerRaw(message: unknown): Promise<void> {
  const { env } = await import("cloudflare:workers");
  await (env.MAILER as unknown as MailerBinding).send(message);
}

export type SendEmailOptions = {
  fromName?: string;
  /** Optional HTML part. When omitted, only plain text is sent. */
  html?: string;
};

/**
 * Send multipart email (plain + optional HTML). Prefer branded helpers for product mail.
 */
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  options?: SendEmailOptions,
): Promise<void> {
  const from = requireSmtpMailFrom();
  const { EmailMessage } = await import("cloudflare:email");
  const { createMimeMessage } = await import("mimetext");

  const msg = createMimeMessage();
  msg.setSender({
    name: options?.fromName ?? "ThermalTrace",
    addr: from,
  });
  msg.setRecipient(to);
  msg.setSubject(subject);
  msg.addMessage({ contentType: "text/plain", data: text });
  if (options?.html?.trim()) {
    msg.addMessage({ contentType: "text/html", data: options.html });
  }

  await sendMailerRaw(new EmailMessage(from, to, msg.asRaw()));
}

/** Plain or multipart send — pass html when available. */
export async function sendPlainEmail(
  to: string,
  subject: string,
  body: string,
  options?: { fromName?: string; html?: string },
): Promise<void> {
  await sendEmail(to, subject, body, options);
}

/** Hard errors fail the job; recipient-not-allowed is a binding/config limit. */
export function partitionMailErrors(errors: string[]): {
  hardErrors: string[];
  restrictedErrors: string[];
} {
  const hardErrors: string[] = [];
  const restrictedErrors: string[] = [];
  for (const err of errors) {
    if (/not allowed/i.test(err)) {
      restrictedErrors.push(err);
    } else {
      hardErrors.push(err);
    }
  }
  return { hardErrors, restrictedErrors };
}
