/** Top of each hour: full maintenance bundle plus history poll. */
export const CRON_FULL_HOURLY = "0 * * * *";

/** :15, :30, :45 — pull-feed history poll only (keeps stale warnings accurate). */
export const CRON_POLL_QUARTERS = "15,30,45 * * * *";

export const WORKER_CRONS = [CRON_FULL_HOURLY, CRON_POLL_QUARTERS] as const;

export function isFullHourlyCronRun(cron: string): boolean {
  return cron === CRON_FULL_HOURLY;
}
