export const RAW_READING_RETENTION_DAYS = 90;

export function shouldRunDailyRetention(now = new Date()): boolean {
  // Once per day at 03:00 UTC alongside hourly cron
  return now.getUTCHours() === 3;
}
