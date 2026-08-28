// API route for handling contact form submissions
export const prerender = false;
import type { APIRoute } from "astro";
import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";
import { createServerClient } from "../../lib/supabase";
import { getTurnstileToken, verifyTurnstileToken } from "../../lib/turnstile";
import { requireSmtpMailFrom, sendMailerRaw } from "../../lib/mailer";

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const data = await request.formData();
  const turnstile = await verifyTurnstileToken(
    getTurnstileToken(data),
    clientAddress,
  );

  if (!turnstile.success) {
    return new Response(
      JSON.stringify({ message: turnstile.error ?? "Verification failed." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const name = data.get("name")?.toString().trim();
  const email = data.get("email")?.toString().trim();
  const message = data.get("message")?.toString().trim();

  if (!name || !email || !message) {
    return new Response(
      JSON.stringify({ message: "Missing required fields." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const from = requireSmtpMailFrom();
  const to = import.meta.env.SMTP_MAIL_TO?.trim();
  if (!to) {
    return new Response(
      JSON.stringify({ message: "Mail recipient is not configured." }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const msg = createMimeMessage();
  msg.setSender({ name: "ThermalTrace", addr: from });
  msg.setRecipient(to);
  msg.setSubject("Contact Form Submission");
  msg.addMessage({
    contentType: "text/plain",
    data: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
  });

  const mailMessage = new EmailMessage(from, to, msg.asRaw());

  try {
    await sendMailerRaw(mailMessage);

    const supabase = createServerClient();
    const { error } = await supabase.from("contacts").insert([
      { name, email, message },
    ]);

    if (error) {
      console.error("Failed to store contact submission:", error.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Contact form submitted successfully.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("Contact form error:", errorMessage);

    return new Response(
      JSON.stringify({ message: "Failed to send message. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
