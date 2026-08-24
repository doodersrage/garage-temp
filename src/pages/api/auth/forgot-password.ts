import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import { getTurnstileToken, verifyTurnstileToken } from "../../../lib/turnstile";
import { resolveSiteUrl } from "../../../lib/schemaMarkup";

export const POST: APIRoute = async ({ request, redirect, clientAddress, site }) => {
  const formData = await request.formData();
  const email = formData.get("email")?.toString()?.trim();

  const turnstile = await verifyTurnstileToken(
    getTurnstileToken(formData),
    clientAddress,
  );

  if (!turnstile.success) {
    return redirect("/forgot-password?error=verification");
  }

  if (!email) {
    return redirect("/forgot-password?error=missing_email");
  }

  const siteUrl = resolveSiteUrl(site);
  const redirectTo = `${siteUrl}/reset-password`;

  await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  return redirect("/forgot-password?sent=1");
};
