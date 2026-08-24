import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { updateUserAlertSettings } from "../../../lib/alertNotifications";
import type { AlertSettings } from "../../../lib/alerts";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session } = await getAuthFromCookies(cookies);

  if (!session) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard";

  const settings: AlertSettings = {
    enabled: formData.has("alerts_enabled"),
    freezeThresholdF: Number(formData.get("freeze_threshold_f") ?? 34),
    humidityThreshold: Number(formData.get("humidity_threshold") ?? 75),
    email: formData.get("alert_email")?.toString().trim() || null,
  };

  const { error } = await updateUserAlertSettings(
    session.access_token,
    session.refresh_token,
    settings,
  );

  if (error) {
    return redirect(`${redirectTo}?alert_error=1`);
  }

  return redirect(`${redirectTo}?alert_saved=1`);
};
