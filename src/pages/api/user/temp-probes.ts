import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { parseTempProbesFromFormData } from "../../../lib/tempFeedConfig";
import { getUserTempConfig, saveUserTempProbes } from "../../../lib/userTempConfig";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard";
  const tempConfig = await getUserTempConfig(user);
  const tempProbes = parseTempProbesFromFormData(formData, tempConfig.feeds);

  const { error } = await saveUserTempProbes(user.id, tempProbes);

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  return redirect(redirectTo);
};
