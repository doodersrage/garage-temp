import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../../lib/auth";
import { isUserAdmin } from "../../../../lib/adminAccess";
import { setUserAdminMembership } from "../../../../lib/userManager";
import { formRedirectPath } from "../../../../lib/siteUrl";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    return redirect("/signin");
  }

  const admin = await isUserAdmin(user.id);

  if (!admin) {
    return redirect("/dashboard");
  }

  const formData = await request.formData();
  const targetUserId = formData.get("user_id")?.toString().trim() ?? "";
  const makeAdmin = formData.get("make_admin")?.toString() === "true";
  const redirectTo = formRedirectPath(formData, "/dashboard/users");

  if (!targetUserId) {
    return redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}status=error`);
  }

  const { error } = await setUserAdminMembership(
    user.id,
    targetUserId,
    makeAdmin,
  );

  if (error) {
    return redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}status=error`);
  }

  return redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}status=updated`);
};
