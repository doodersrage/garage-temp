import type { AlertSettings, NotifyKind } from "./alerts";

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function parseHhMm(value: string): number | null {
  const match = TIME_RE.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Minutes from midnight in the given IANA timezone. */
export function localMinutesNow(timeZone: string, now = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return hour * 60 + minute;
  } catch {
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
}

/**
 * Quiet hours window may wrap midnight (e.g. 22:00–07:00).
 * Returns true when `now` falls inside [start, end).
 */
export function isWithinQuietWindow(
  startHhMm: string,
  endHhMm: string,
  timeZone: string,
  now = new Date(),
): boolean {
  const start = parseHhMm(startHhMm);
  const end = parseHhMm(endHhMm);
  if (start == null || end == null) return false;

  const current = localMinutesNow(timeZone, now);
  if (start === end) return true; // full-day quiet
  if (start < end) {
    return current >= start && current < end;
  }
  return current >= start || current < end;
}

export function isInQuietHours(
  settings: AlertSettings,
  now = new Date(),
): boolean {
  if (!settings.quietHoursEnabled) return false;
  return isWithinQuietWindow(
    settings.quietHoursStart,
    settings.quietHoursEnd,
    settings.quietHoursTimezone,
    now,
  );
}

function isCriticalNotifyKind(kind: NotifyKind | undefined): boolean {
  return (
    kind === "threshold" ||
    kind === "forecast" ||
    kind === "runway" ||
    kind === "nws" ||
    kind === "flood"
  );
}

/** Kinds that bypass quiet hours when bypass_freeze is enabled. */
export function quietHoursBypassed(
  settings: AlertSettings,
  kind: NotifyKind | undefined,
): boolean {
  if (!settings.quietHoursBypassFreeze) return false;
  return isCriticalNotifyKind(kind);
}

export function shouldSuppressForQuietHours(
  settings: AlertSettings,
  kind: NotifyKind | undefined,
  now = new Date(),
): boolean {
  if (!isInQuietHours(settings, now)) return false;
  if (quietHoursBypassed(settings, kind)) return false;
  return true;
}

/**
 * When quiet hours are active and full bypass does not apply, still allow SMS
 * for freeze/flood/forecast if quietHoursSmsCritical is enabled.
 */
export function quietHoursAllowsSmsCritical(
  settings: AlertSettings,
  kind: NotifyKind | undefined,
  now = new Date(),
): boolean {
  if (!isInQuietHours(settings, now)) return false;
  if (quietHoursBypassed(settings, kind)) return false;
  if (!settings.quietHoursSmsCritical) return false;
  return isCriticalNotifyKind(kind);
}
