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
import { formRedirectPath } from "../../../lib/siteUrl";

const SNOOZE_MAX_HOURS = 168;
const VACATION_MAX_DAYS = 30;

function parsePositiveInt(raw: FormDataEntryValue | null): number | null {
  if (raw == null) return null;
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return redirect("/signin");
  }

  const formData = await request.formData();
  const redirectTo = formRedirectPath(formData, "/dashboard/alerts");

  const editor = await requireHouseholdEditor(user.id);
  const blocked = redirectUnlessEditor(editor, redirectTo, redirect);
  if (blocked) return blocked;

  const action = formData.get("action")?.toString();
  const settings = await getAlertSettingsForUser(
    user.id,
    user.user_metadata as Record<string, unknown>,
  );

  if (action === "snooze_24" || action === "snooze") {
    const hours =
      action === "snooze_24"
        ? 24
        : Math.min(parsePositiveInt(formData.get("hours")) ?? 24, SNOOZE_MAX_HOURS);
    await saveAlertSettingsForUser(user.id, {
      ...settings,
      snoozeUntil: snoozeUntilFromHours(hours),
    });
    return redirect(`${redirectTo}?snooze=1`);
  }

  if (action === "vacation_7" || action === "vacation") {
    const days =
      action === "vacation_7"
        ? 7
        : Math.min(parsePositiveInt(formData.get("days")) ?? 7, VACATION_MAX_DAYS);
    await saveAlertSettingsForUser(user.id, {
      ...settings,
      vacationUntil: vacationUntilFromDays(days),
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
