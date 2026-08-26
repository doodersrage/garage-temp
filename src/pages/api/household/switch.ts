import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { setActiveHouseholdForUser } from "../../../lib/households";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData().catch(() => null);
  const householdId = formData?.get("household_id")?.toString().trim();
  const redirectTo = formData?.get("redirect")?.toString() || "/dashboard";

  if (!householdId) {
    return redirect(`${redirectTo}?household_error=1`);
  }

  const { error } = await setActiveHouseholdForUser(user.id, householdId);
  if (error) {
    return redirect(`${redirectTo}?household_error=1`);
  }

  return redirect(`${redirectTo}?household_switched=1`);
};
