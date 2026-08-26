import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getOrCreateHouseholdForUser } from "../../../lib/households";
import { getUserEntitlements } from "../../../lib/entitlements";
import {
  createHouseholdApiKey,
  revokeHouseholdApiKey,
} from "../../../lib/apiKeys";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { user } = await getAuthFromCookies(cookies);
  if (!user) return redirect("/signin");

  const entitlements = await getUserEntitlements(user.id);
  const formData = await request.formData();
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard/share";
  const action = formData.get("action")?.toString() ?? "create";

  if (!entitlements.canCreateShareLinks) {
    return redirect(`${redirectTo}?error=pro_required`);
  }

  const household = await getOrCreateHouseholdForUser(user.id, user.email);
  if (!household.householdId) {
    return redirect(`${redirectTo}?error=1`);
  }

  if (action === "revoke") {
    const id = formData.get("id")?.toString();
    if (id) {
      await revokeHouseholdApiKey(household.householdId, id);
    }
    return redirect(`${redirectTo}?api_key_revoked=1`);
  }

  const name = formData.get("name")?.toString() ?? "Metrics key";
  const result = await createHouseholdApiKey({
    householdId: household.householdId,
    name,
    createdBy: user.id,
  });
  if (result.error || !result.plaintext) {
    return redirect(`${redirectTo}?error=1`);
  }

  return redirect(
    `${redirectTo}?api_key_created=1&new_api_key=${encodeURIComponent(result.plaintext)}`,
  );
};
