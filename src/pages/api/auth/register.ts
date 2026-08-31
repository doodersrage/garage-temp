import type { APIRoute } from "astro";
import { createAuthClient } from "../../../lib/supabase";
import { getTurnstileToken, verifyTurnstileToken } from "../../../lib/turnstile";
import {
  applyReferralForNewUser,
} from "../../../lib/referrals";

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
  const refCode = formData.get("ref")?.toString()?.trim().toLowerCase() ?? "";

  if (!email || !password) {
    return redirect("/register?error=missing_fields");
  }

  if (password.length < 8) {
    return redirect("/register?error=weak_password");
  }

  // Fresh client -- never the shared `supabase` singleton, which would
  // leave this newly-created session sitting as ambient state for any
  // other concurrent request on the same Worker isolate to pick up.
  const { data, error } = await createAuthClient().auth.signUp({
    email,
    password,
  });

  if (error) {
    return redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user && refCode) {
    await applyReferralForNewUser(data.user.id, refCode, data.user.app_metadata);
  }

  const next = formData.get("next")?.toString() ?? "";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "";
  const params = new URLSearchParams({ registered: "1" });
  if (safeNext) params.set("next", safeNext);
  return redirect(`/signin?${params.toString()}`);
};
