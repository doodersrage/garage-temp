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
  const status = formData.get("status")?.toString() ?? "read";
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard/contacts";

  if (!Number.isFinite(id) || !ALLOWED_STATUSES.has(status)) {
    return redirect(`${redirectTo}?contact_error=1`);
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("contacts")
    .update({ status })
    .eq("id", id);

  if (error) {
    return redirect(`${redirectTo}?contact_error=1`);
  }

  return redirect(redirectTo);
};
