import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../../lib/auth";
import { deleteUserAccount } from "../../../../lib/accountLifecycle";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { user } = await getAuthFromCookies(cookies);
  if (!user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const confirm = formData.get("confirm")?.toString();
  const redirectTo = formData.get("redirect")?.toString() || "/";

  if (confirm !== "DELETE") {
    return redirect("/dashboard/settings?delete_error=confirm");
  }

  const { error } = await deleteUserAccount(user.id);
  if (error) {
    return redirect("/dashboard/settings?delete_error=1");
  }

  cookies.delete("sb-access-token", { path: "/" });
  cookies.delete("sb-refresh-token", { path: "/" });

  return redirect(`${redirectTo}?account_deleted=1`);
};
