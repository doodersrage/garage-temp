import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session } = await getAuthFromCookies(cookies);

  if (!session) {
    return redirect("/signin?error=generic");
  }

  const formData = await request.formData();
  const password = formData.get("password")?.toString();
  const confirm = formData.get("confirm")?.toString();

  if (!password || password.length < 8) {
    return redirect("/reset-password?error=weak");
  }

  if (password !== confirm) {
    return redirect("/reset-password?error=mismatch");
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  if (sessionError) {
    return redirect("/reset-password?error=session");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return redirect("/reset-password?error=update");
  }

  return redirect("/dashboard?password=updated");
};
