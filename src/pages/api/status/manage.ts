import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getUserEntitlements } from "../../../lib/entitlements";
import {
  householdManagerCtx,
  redirectUnlessManager,
  requireHouseholdManager,
} from "../../../lib/householdAuth";
import { recordHouseholdActivity } from "../../../lib/householdActivity";
import {
  createStatusPageToken,
  revokeStatusPageToken,
} from "../../../lib/statusPage";
import { formRedirectPath } from "../../../lib/siteUrl";
import { FLASH_STATUS_TOKEN, setSecretFlash } from "../../../lib/secretFlash";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { user } = await getAuthFromCookies(cookies);
  if (!user) return redirect("/signin");

  const formData = await request.formData();
  const redirectTo = formRedirectPath(formData, "/dashboard/share");
  const action = formData.get("action")?.toString() ?? "create";

  const manager = await requireHouseholdManager(user.id);
  const blocked = redirectUnlessManager(manager, redirectTo, redirect);
  if (blocked) return blocked;

  const entitlements = await getUserEntitlements(user.id);
  if (!entitlements.canCreateShareLinks) {
    return redirect(`${redirectTo}?status_error=pro`);
  }

  const householdId = householdManagerCtx(manager).householdId;

  if (action === "revoke") {
    const id = formData.get("id")?.toString();
    if (id) {
      await revokeStatusPageToken(householdId, id);
      await recordHouseholdActivity({
        householdId,
        userId: user.id,
        action: "status_page_revoked",
        detail: id,
      });
    }
    return redirect(`${redirectTo}?status_revoked=1`);
  }

  const label = formData.get("label")?.toString() || "Status page";
  const { token, error } = await createStatusPageToken(householdId, label);
  if (error || !token) {
    return redirect(`${redirectTo}?status_error=1`);
  }

  await recordHouseholdActivity({
    householdId,
    userId: user.id,
    action: "status_page_created",
    detail: label,
  });

  setSecretFlash(cookies, FLASH_STATUS_TOKEN, token);
  return redirect(`${redirectTo}?status_created=1`);
};
