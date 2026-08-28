import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { isUserAdmin } from "../../../lib/adminAccess";
import { createAdminClient } from "../../../lib/supabase";
import { resolveSiteUrl } from "../../../lib/schemaMarkup";
import { buildDripEmail } from "../../../lib/dripEmails";
import { buildTrialReminderEmail } from "../../../lib/trialEmails";

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
  const templates = {
    drip_day1: () => {
      const mail = buildDripEmail("day1", siteUrl);
      return { subject: `[Test] ${mail.subject}`, text: mail.text, html: mail.html };
    },
    drip_day3: () => {
      const mail = buildDripEmail("day3", siteUrl);
      return { subject: `[Test] ${mail.subject}`, text: mail.text, html: mail.html };
    },
    trial_3d: () => {
      const mail = buildTrialReminderEmail({ plan: "Pro", remaining: 3, siteUrl });
      return { subject: `[Test] ${mail.subject}`, text: mail.text, html: mail.html };
    },
  } as const;

  const build = templates[kind as keyof typeof templates] ?? templates.drip_day1;
  const template = build();

  const from = import.meta.env.SMTP_MAIL_FROM;
  if (!from) {
    return new Response("SMTP_MAIL_FROM not configured", { status: 503 });
  }

  try {
    const { sendEmail } = await import("../../../lib/mailer");
    await sendEmail(email, template.subject, template.text, { html: template.html });

    return new Response(null, {
      status: 302,
      headers: { Location: "/dashboard/ops?email_test=1" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    return new Response(message, { status: 500 });
  }
};
