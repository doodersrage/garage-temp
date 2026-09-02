import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { parseTempFeedsFromFormData } from "../../../lib/tempFeedConfig";
import { saveUserTempFeeds } from "../../../lib/userTempConfig";
import {
  redirectUnlessEditor,
  requireHouseholdEditor,
} from "../../../lib/householdAuth";
import { formRedirectPath } from "../../../lib/siteUrl";

/** @deprecated Prefer POST /api/user/pull-setup */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const redirectTo = formRedirectPath(formData, "/dashboard/temperature?tab=pull");

  const editor = await requireHouseholdEditor(user.id);
  const blocked = redirectUnlessEditor(editor, redirectTo, redirect);
  if (blocked) return blocked;
  const tempFeeds = parseTempFeedsFromFormData(formData);

  const { error, discoveredProbes } = await saveUserTempFeeds(user.id, tempFeeds);

  if (error) {
    return redirect(`${redirectTo.split("?")[0]}?feeds_error=1&tab=pull`);
  }

  const query = new URLSearchParams({ pull_saved: "1", tab: "pull" });
  if (discoveredProbes && discoveredProbes > 0) {
    query.set("probes_discovered", String(discoveredProbes));
  }
  return redirect(`${redirectTo.split("?")[0]}?${query.toString()}`);
};
