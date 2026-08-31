import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { parseTempProbesFromFormData } from "../../../lib/tempFeedConfig";
import { getUserTempConfig, saveUserTempProbes } from "../../../lib/userTempConfig";

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

  const tempConfig = await getUserTempConfig(user);
  const tempProbes = parseTempProbesFromFormData(formData, tempConfig.feeds);

  const { error } = await saveUserTempProbes(user.id, tempProbes);

  if (error) {
    return redirect(`${redirectTo}?probes_error=1`);
  }

  return redirect(`${redirectTo}?probes_saved=1`);
};
