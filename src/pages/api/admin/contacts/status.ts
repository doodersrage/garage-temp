import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../../lib/auth";
import { isUserAdmin } from "../../../../lib/adminAccess";
import { createServerClient } from "../../../../lib/supabase";

const ALLOWED_STATUSES = new Set(["new", "read", "spam"]);

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user || !(await isUserAdmin(user.id))) {
    return new Response("Forbidden", { status: 403 });
  }

  const formData = await request.formData();
  const id = Number(formData.get("id"));
  const status = formData.get("status")?.toString();
  const adminNotes = formData.get("admin_notes")?.toString();
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard/contacts";

  if (!Number.isFinite(id)) {
    return redirect(`${redirectTo}?contact_error=1`);
  }

  const updates: Record<string, string> = {};
  if (status && ALLOWED_STATUSES.has(status)) {
    updates.status = status;
  }
  if (adminNotes !== undefined) {
    updates.admin_notes = adminNotes;
  }

  if (Object.keys(updates).length === 0) {
    return redirect(`${redirectTo}?contact_error=1`);
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("contacts").update(updates).eq("id", id);

  if (error) {
    return redirect(`${redirectTo}?contact_error=1`);
  }

  return redirect(redirectTo);
};
