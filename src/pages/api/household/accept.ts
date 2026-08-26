import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { acceptHouseholdInvite } from "../../../lib/householdInvites";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const token = formData.get("token")?.toString();
  if (!token) {
    return redirect("/dashboard/household?error=1");
  }

  const result = await acceptHouseholdInvite(token, user.id, user.email);
  if (result.error) {
    const code =
      result.error.toLowerCase().includes("invited email")
        ? "email_mismatch"
        : result.error;
    return redirect(
      `/invite/${token}?error=${encodeURIComponent(code)}`,
    );
  }

  return redirect("/dashboard/household?joined=1");
};
