/** Shared outbound email via Cloudflare Email binding. */

export function isMailerRecipientNotAllowed(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /not allowed/i.test(message) || /recipient.*not.*allowed/i.test(message);
}

export async function sendPlainEmail(
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  const from = import.meta.env.SMTP_MAIL_FROM?.trim();
  if (!from) {
    throw new Error("SMTP_MAIL_FROM is not configured");
  }

  const { EmailMessage } = await import("cloudflare:email");
  const { createMimeMessage } = await import("mimetext");
  const { env } = await import("cloudflare:workers");

  const msg = createMimeMessage();
  msg.setSender({
    name: "Garage Temp Monitor",
    addr: from,
  });
  msg.setRecipient(to);
  msg.setSubject(subject);
  msg.addMessage({ contentType: "text/plain", data: body });

  await env.MAILER.send(new EmailMessage(from, to, msg.asRaw()));
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
