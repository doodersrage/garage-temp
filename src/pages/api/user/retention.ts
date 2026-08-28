import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getAlertSettingsForUser, saveAlertSettingsForUser } from "../../../lib/notify";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { user } = await getAuthFromCookies(cookies);
  if (!user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard/settings";
  const raw = formData.get("data_retention_days");
  const settings = await getAlertSettingsForUser(user.id, user.user_metadata);

  if (raw == null || raw === "") {
    settings.dataRetentionDays = null;
  } else {
    const n = Number(raw);
    settings.dataRetentionDays =
      Number.isFinite(n) && n >= 30 ? Math.min(Math.floor(n), 730) : settings.dataRetentionDays;
  }

  const { error } = await saveAlertSettingsForUser(user.id, settings);
  if (error) {
    return redirect(`${redirectTo}?retention_error=1`);
  }

  return redirect(`${redirectTo}?retention_saved=1`);
};
