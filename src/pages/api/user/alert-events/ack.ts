import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../../lib/auth";
import { acknowledgeAlertEvent } from "../../../../lib/alertEvents";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const eventId = Number(formData.get("event_id"));
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard/alerts";

  if (!Number.isFinite(eventId)) {
    return redirect(`${redirectTo}?ack_error=1`);
  }

  const result = await acknowledgeAlertEvent(user.id, eventId);
  if (!result.ok) {
    return redirect(`${redirectTo}?ack_error=1`);
  }

  return redirect(`${redirectTo}?ack_ok=1`);
};
