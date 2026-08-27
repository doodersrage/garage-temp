import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getUserEntitlements } from "../../../lib/entitlements";
import {
  householdEditorCtx,
  redirectUnlessEditor,
  requireHouseholdEditor,
} from "../../../lib/householdAuth";
import { recordHouseholdActivity } from "../../../lib/householdActivity";
import {
  createStatusPageToken,
  revokeStatusPageToken,
} from "../../../lib/statusPage";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { user } = await getAuthFromCookies(cookies);
  if (!user) return redirect("/signin");

  const formData = await request.formData();
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard/share";
  const action = formData.get("action")?.toString() ?? "create";

  const editor = await requireHouseholdEditor(user.id);
  const blocked = redirectUnlessEditor(editor, redirectTo, redirect);
  if (blocked) return blocked;

  const entitlements = await getUserEntitlements(user.id);
  if (!entitlements.canCreateShareLinks) {
    return redirect(`${redirectTo}?status_error=pro`);
  }

  const householdId = householdEditorCtx(editor).householdId;

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

  return redirect(
    `${redirectTo}?status_created=1&status_token=${encodeURIComponent(token)}`,
  );
};
