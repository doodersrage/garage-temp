import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import { getTurnstileToken, verifyTurnstileToken } from "../../../lib/turnstile";

export const POST: APIRoute = async ({ request, redirect, clientAddress }) => {
  const formData = await request.formData();
  const turnstile = await verifyTurnstileToken(
    getTurnstileToken(formData),
    clientAddress,
  );

  if (!turnstile.success) {
    return redirect("/register?error=verification");
  }

  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return redirect("/register?error=missing_fields");
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  return redirect("/signin?registered=1");
};
