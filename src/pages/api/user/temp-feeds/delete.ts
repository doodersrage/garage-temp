import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../../lib/auth";
import { deleteUserTempFeed } from "../../../../lib/userTempConfig";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard";
  const feedId = formData.get("feed_id")?.toString().trim() ?? "";

  if (!feedId) {
    return new Response("Feed id is required", { status: 400 });
  }

  const { error } = await deleteUserTempFeed(user.id, feedId);

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  return redirect(redirectTo);
};
