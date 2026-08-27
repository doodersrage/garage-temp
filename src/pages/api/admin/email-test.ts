import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { isUserAdmin } from "../../../lib/adminAccess";
import { createAdminClient } from "../../../lib/supabase";
import { resolveSiteUrl } from "../../../lib/schemaMarkup";

export const POST: APIRoute = async ({ request, cookies }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user || !(await isUserAdmin(user.id))) {
    return new Response("Forbidden", { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  const kind = formData?.get("kind")?.toString() ?? "drip_day1";
  const admin = createAdminClient();
  const { data: authData } = await admin.auth.admin.getUserById(user.id);
  const email = authData.user?.email ?? user.email;
  if (!email) {
    return new Response("No email on account", { status: 400 });
  }

  const siteUrl = resolveSiteUrl(null);
  const subjects: Record<string, { subject: string; body: string }> = {
    drip_day1: {
      subject: "[Test] Add your first probe to Garage Temp",
      body: [
        "Welcome to Garage Temp!",
        "",
        "Next step: add a push device or JSON feed.",
        `${siteUrl}/dashboard/temperature`,
      ].join("\n"),
    },
    drip_day3: {
      subject: "[Test] Turn on freeze alerts",
      body: [
        "Set a threshold under Alerts — most users start around 34°F.",
        `${siteUrl}/dashboard/alerts`,
      ].join("\n"),
    },
    trial_3d: {
      subject: "[Test] Your Garage Temp Pro trial ends in 3 days",
      body: [`Keep SMS, push, and share links: ${siteUrl}/dashboard/plans`].join("\n"),
    },
  };

  const template = subjects[kind] ?? subjects.drip_day1;

  const from = import.meta.env.SMTP_MAIL_FROM;
  if (!from) {
    return new Response("SMTP_MAIL_FROM not configured", { status: 503 });
  }

  try {
    const { EmailMessage } = await import("cloudflare:email");
    const { createMimeMessage } = await import("mimetext");
    const { env } = await import("cloudflare:workers");

    const msg = createMimeMessage();
    msg.setSender({
      name: "Garage Temp Monitor",
      addr: from,
    });
    msg.setRecipient(email);
    msg.setSubject(template.subject);
    msg.addMessage({ contentType: "text/plain", data: template.body });

    await env.MAILER.send(new EmailMessage(from, email, msg.asRaw()));

    return new Response(null, {
      status: 302,
      headers: { Location: "/dashboard/ops?email_test=1" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    return new Response(message, { status: 500 });
  }
};
