import type { AlertSettings, NotifyKind } from "./alerts";

const SNOOZE_BLOCKED: NotifyKind[] = [
  "threshold",
  "rate",
  "digest",
  "generic",
  "forecast",
  "runway",
  "nws",
  "rule",
  "battery",
  "rssi",
];

const VACATION_BLOCKED: NotifyKind[] = [
  "threshold",
  "rate",
  "digest",
  "generic",
  "rule",
  "battery",
  "rssi",
];

export function isSnoozeActive(settings: AlertSettings, now = Date.now()): boolean {
  if (!settings.snoozeUntil) return false;
  const until = Date.parse(settings.snoozeUntil);
  return Number.isFinite(until) && now < until;
}

export function isVacationActive(settings: AlertSettings, now = Date.now()): boolean {
  if (!settings.vacationUntil) return false;
  const until = Date.parse(settings.vacationUntil);
  return Number.isFinite(until) && now < until;
}

export function shouldSuppressForSnoozeOrVacation(
  settings: AlertSettings,
  kind: NotifyKind | undefined,
): boolean {
  const k = kind ?? "generic";
  if (isSnoozeActive(settings) && SNOOZE_BLOCKED.includes(k)) return true;
  if (isVacationActive(settings) && VACATION_BLOCKED.includes(k)) return true;
  return false;
}

export function snoozeUntilFromHours(hours: number, now = Date.now()): string {
  return new Date(now + hours * 60 * 60 * 1000).toISOString();
}

export function vacationUntilFromDays(days: number, now = Date.now()): string {
  return new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
}

/** Persist snooze on alert_settings for a user (used by ack playbook). */
export async function snoozeAlertsForUser(
  userId: string,
  hours: number,
): Promise<void> {
  const { getAlertSettingsForUser, saveAlertSettingsForUser } = await import("./notify");
  const settings = await getAlertSettingsForUser(userId, {});
  await saveAlertSettingsForUser(userId, {
    ...settings,
    snoozeUntil: snoozeUntilFromHours(hours),
  });
}
