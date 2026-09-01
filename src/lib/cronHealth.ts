/** Expected interval between collect-history cron runs. */
export const HISTORY_POLL_INTERVAL_MS = 15 * 60 * 1000;

/** Grace after two missed 15-minute slots before marking polls stale. */
export const HISTORY_POLL_GRACE_MS = 5 * 60 * 1000;

/** Two missed polls plus grace (~35 minutes). */
export const HISTORY_POLL_STALE_MS =
  HISTORY_POLL_INTERVAL_MS * 2 + HISTORY_POLL_GRACE_MS;

export function isCollectHistoryStale(
  lastSuccessAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!lastSuccessAt) return true;
  const parsed = Date.parse(lastSuccessAt);
  if (Number.isNaN(parsed)) return true;
  return now - parsed > HISTORY_POLL_STALE_MS;
}

export function collectHistoryStaleMessage(
  lastSuccessAt: string | null | undefined,
): string {
  if (!lastSuccessAt) {
    return "No successful history poll recorded in the last 24 hours.";
  }
  return `Last successful history poll was more than ${Math.round(HISTORY_POLL_STALE_MS / 60000)} minutes ago.`;
}

export async function fetchLastSuccessfulCollectHistory(
  sinceMs = 24 * 60 * 60 * 1000,
): Promise<string | null> {
  const { createAdminClient } = await import("./supabase");
  const admin = createAdminClient();
  const since = new Date(Date.now() - sinceMs).toISOString();
  const { data } = await admin
    .from("job_runs")
    .select("started_at")
    .eq("job_name", "collect-history")
    .eq("status", "success")
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(1);

  return data?.[0]?.started_at ?? null;
}
