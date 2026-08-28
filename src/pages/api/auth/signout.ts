import type { APIRoute } from "astro";
import { sanitizeNextPath } from "../../../lib/siteUrl";
import { MFA_REQUIRED_COOKIE } from "../../../lib/mfa";

export const GET: APIRoute = async ({ cookies, redirect, url }) => {
  cookies.delete("sb-access-token", { path: "/" });
  cookies.delete("sb-refresh-token", { path: "/" });
  cookies.delete(MFA_REQUIRED_COOKIE, { path: "/" });

  const safeNext = sanitizeNextPath(url.searchParams.get("next"));
  const email = url.searchParams.get("email")?.trim() ?? "";

  if (safeNext) {
    const params = new URLSearchParams({ next: safeNext });
    if (email) params.set("email", email);
    return redirect(`/signin?${params.toString()}`);
  }

  return redirect("/signin");
};
