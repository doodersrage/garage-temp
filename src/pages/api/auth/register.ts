import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import { getTurnstileToken, verifyTurnstileToken } from "../../../lib/turnstile";
import { createAdminClient } from "../../../lib/supabase";
import {
  recordReferralSignup,
  resolveReferrerUserId,
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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user && refCode) {
    const referrerId = await resolveReferrerUserId(refCode);
    if (referrerId) {
      await recordReferralSignup(referrerId, data.user.id);
      const admin = createAdminClient();
      await admin.auth.admin.updateUserById(data.user.id, {
        user_metadata: {
          ...(data.user.user_metadata ?? {}),
          referred_by: refCode,
        },
      });
    }
  }

  const next = formData.get("next")?.toString() ?? "";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "";
  const params = new URLSearchParams({ registered: "1" });
  if (safeNext) params.set("next", safeNext);
  return redirect(`/signin?${params.toString()}`);
};
