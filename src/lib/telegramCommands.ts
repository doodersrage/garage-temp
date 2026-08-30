const SNOOZE_MAX_HOURS = 168;
const VACATION_MAX_DAYS = 30;

function parseLeadingInt(token: string | undefined): number | null {
  if (!token) return null;
  const match = token.match(/^(\d+)/);
  if (!match) return null;
  const n = Number.parseInt(match[1]!, 10);
  return Number.isFinite(n) ? n : null;
}

export function parseTelegramSnoozeHours(text: string, fallback = 24): number {
  const token = text.trim().split(/\s+/)[1];
  const hours = parseLeadingInt(token);
  if (hours == null || hours < 1) return fallback;
  return Math.min(hours, SNOOZE_MAX_HOURS);
}

export function parseTelegramVacationDays(text: string, fallback = 7): number {
  const token = text.trim().split(/\s+/)[1];
  const days = parseLeadingInt(token);
  if (days == null || days < 1) return fallback;
  return Math.min(days, VACATION_MAX_DAYS);
}

export const TELEGRAM_HELP =
  "Commands: /status [name], /snooze [hours], /vacation [days], /help";

export function telegramStatusQuery(text: string): string {
  return text.trim().split(/\s+/).slice(1).join(" ").toLowerCase();
}

export function filterRowsByLabel<T extends { sensor: { label: string } }>(
  rows: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => row.sensor.label.toLowerCase().includes(q));
}
