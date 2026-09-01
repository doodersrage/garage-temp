export const RAW_READING_RETENTION_DAYS = 90;

export function shouldRunDailyRetention(now = new Date()): boolean {
  // Once per day at 03:00 UTC on the top-of-hour cron run
  return now.getUTCHours() === 3;
}

/** ISO cutoff for the oldest reading a plan may view. */
export function historyCutoffIso(historyDays: number, now = new Date()): string {
  const cutoff = new Date(now.getTime());
  cutoff.setUTCDate(cutoff.getUTCDate() - historyDays);
  return cutoff.toISOString();
}

/** Clamp an optional `from` timestamp so it never starts before the plan window. */
export function clampIsoToHistoryWindow(
  from: string | undefined,
  historyDays: number,
  now = new Date(),
): string {
  const cutoff = historyCutoffIso(historyDays, now);
  if (!from) return cutoff;
  return Date.parse(from) < Date.parse(cutoff) ? cutoff : from;
}
