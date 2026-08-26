import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { parseTempFeedsFromFormData } from "../../../lib/tempFeedConfig";
import { saveUserTempFeeds } from "../../../lib/userTempConfig";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard/temperature";
  const tempFeeds = parseTempFeedsFromFormData(formData);

  const { error } = await saveUserTempFeeds(user.id, tempFeeds);

  if (error) {
    return redirect(`${redirectTo}?feeds_error=1`);
  }

  return redirect(`${redirectTo}?feeds_saved=1`);
};
