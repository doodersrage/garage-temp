import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { parseTempFeedsFromFormData } from "../../../lib/tempFeedConfig";
import { saveUserTempFeeds } from "../../../lib/userTempConfig";
import {
  redirectUnlessEditor,
  requireHouseholdEditor,
} from "../../../lib/householdAuth";
import { formRedirectPath } from "../../../lib/siteUrl";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const redirectTo = formRedirectPath(formData, "/dashboard/temperature");

  const editor = await requireHouseholdEditor(user.id);
  const blocked = redirectUnlessEditor(editor, redirectTo, redirect);
  if (blocked) return blocked;
  const tempFeeds = parseTempFeedsFromFormData(formData);

  const { error, discoveredProbes } = await saveUserTempFeeds(user.id, tempFeeds);

  if (error) {
    return redirect(`${redirectTo}?feeds_error=1`);
  }

  const query =
    discoveredProbes && discoveredProbes > 0
      ? `feeds_saved=1&probes_discovered=${discoveredProbes}`
      : "feeds_saved=1";
  return redirect(`${redirectTo}?${query}`);
};
