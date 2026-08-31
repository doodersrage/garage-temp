import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { createAuthClient } from "../../../lib/supabase";

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

  // Fresh client per request -- never the shared `supabase` singleton for
  // this. Cloudflare Workers can interleave concurrent requests within one
  // isolate's shared global scope, so a shared client's setSession() call
  // here would race against any other in-flight request's auth calls, and
  // this updateUser({ password }) call (no explicit token) would silently
  // apply to whichever session most recently "won" the shared client.
  const client = createAuthClient();
  const { error: sessionError } = await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  if (sessionError) {
    return redirect("/reset-password?error=session");
  }

  const { error } = await client.auth.updateUser({ password });

  if (error) {
    return redirect("/reset-password?error=update");
  }

  return redirect("/dashboard?password=updated");
};
