import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getAlertSettingsForUser, notifyUser } from "../../../lib/notify";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard/alerts";

  try {
    const settings = await getAlertSettingsForUser(
      user.id,
      user.user_metadata as Record<string, unknown>,
    );

    await notifyUser(user.id, user.email, settings, {
      title: "Garage Temp test alert",
      body: "This is a test notification from your Garage Temperature Monitor dashboard. If you received this, your alert channels are working.",
      kind: "generic",
    });

    return redirect(`${redirectTo}?test_sent=1`);
  } catch (error) {
    console.error("Test alert failed:", error);
    return redirect(`${redirectTo}?test_error=1`);
  }
};
