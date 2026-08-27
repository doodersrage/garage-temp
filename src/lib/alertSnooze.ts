import type { AlertSettings, NotifyKind } from "./alerts";

const SNOOZE_BLOCKED: NotifyKind[] = [
  "threshold",
  "rate",
  "digest",
  "generic",
  "forecast",
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
