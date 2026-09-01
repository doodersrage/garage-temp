import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import {
  redirectUnlessEditor,
  requireHouseholdEditor,
} from "../../../lib/householdAuth";
import { updateTenantNotifySettings } from "../../../lib/tenantRelay";
import { formRedirectPath } from "../../../lib/siteUrl";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { user } = await getAuthFromCookies(cookies);
  if (!user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const redirectTo = formRedirectPath(formData, "/dashboard/settings");
  const householdId = formData.get("household_id")?.toString();

  const editor = await requireHouseholdEditor(user.id);
  const blocked = redirectUnlessEditor(editor, redirectTo, redirect);
  if (blocked) return blocked;

  if (!householdId || householdId !== editor.ctx.householdId) {
    return redirect(`${redirectTo}?tenant_error=1`);
  }

  const result = await updateTenantNotifySettings(householdId, {
    email: formData.get("tenant_email")?.toString() ?? null,
    name: formData.get("tenant_name")?.toString() ?? null,
  });

  if (result.error) {
    return redirect(`${redirectTo}?tenant_error=${encodeURIComponent(result.error)}`);
  }

  return redirect(`${redirectTo}?tenant_saved=1`);
};
