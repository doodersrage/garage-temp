import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import {
  getAlertSettingsForUser,
  saveAlertSettingsForUser,
} from "../../../lib/notify";
import {
  snoozeUntilFromHours,
  vacationUntilFromDays,
} from "../../../lib/alertSnooze";

import {
  redirectUnlessEditor,
  requireHouseholdEditor,
} from "../../../lib/householdAuth";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const redirectTo = formData.get("redirect")?.toString() || "/dashboard/alerts";

  const editor = await requireHouseholdEditor(user.id);
  const blocked = redirectUnlessEditor(editor, redirectTo, redirect);
  if (blocked) return blocked;

  const action = formData.get("action")?.toString();
  const settings = await getAlertSettingsForUser(
    user.id,
    user.user_metadata as Record<string, unknown>,
  );

  if (action === "snooze_24") {
    await saveAlertSettingsForUser(user.id, {
      ...settings,
      snoozeUntil: snoozeUntilFromHours(24),
    });
    return redirect(`${redirectTo}?snooze=1`);
  }

  if (action === "vacation_7") {
    await saveAlertSettingsForUser(user.id, {
      ...settings,
      vacationUntil: vacationUntilFromDays(7),
    });
    return redirect(`${redirectTo}?vacation=1`);
  }

  if (action === "clear_snooze") {
    await saveAlertSettingsForUser(user.id, { ...settings, snoozeUntil: null });
    return redirect(`${redirectTo}?snooze_cleared=1`);
  }

  if (action === "clear_vacation") {
    await saveAlertSettingsForUser(user.id, { ...settings, vacationUntil: null });
    return redirect(`${redirectTo}?vacation_cleared=1`);
  }

  return redirect(redirectTo);
};
