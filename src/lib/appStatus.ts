import { createAdminClient } from "./supabase";
import { listRecentIngestStatsAdmin } from "./ingestStats";
import { flagIngestAbuse } from "./ingestAbuse";
import { listRecentJobRuns, type JobRun } from "./jobRuns";
import {
  fetchLastSuccessfulCollectHistory,
  isCollectHistoryStale,
} from "./cronHealth";

export type AppStatus = {
  healthy: boolean;
  lastCronAt: string | null;
  lastCronJob: string | null;
  lastCronStatus: string | null;
  lastHistoryPollAt: string | null;
  historyPollStale: boolean;
  recentJobErrors: number;
  ingestAbuseCount: number;
  /** True when rate-limit events were seen in the last 24h (informational). */
  ingestRateLimitElevated: boolean;
  checkedAt: string;
  recentJobRuns: JobRun[];
};

export async function fetchAppStatus(): Promise<AppStatus> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: jobs }, lastHistoryPollAt] = await Promise.all([
    admin
      .from("job_runs")
      .select("job_name, status, started_at")
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(50),
    fetchLastSuccessfulCollectHistory(),
  ]);

  const latest = jobs?.[0] ?? null;
  const recentJobErrors =
    jobs?.filter((job) => job.status === "error").length ?? 0;
  const ingestStats = await listRecentIngestStatsAdmin(1);
  const ingestAbuseCount = flagIngestAbuse(ingestStats).length;
  const { runs: recentJobRuns } = await listRecentJobRuns(14);

  const historyPollStale = isCollectHistoryStale(lastHistoryPollAt);
  const healthy =
    recentJobErrors === 0 &&
    latest != null &&
    latest.status === "success" &&
    !historyPollStale;

  /** Informational rate-limit hits — does not flip the page to degraded by itself. */
  const ingestRateLimitElevated = ingestAbuseCount > 0;

  return {
    healthy,
    lastCronAt: latest?.started_at ?? null,
    lastCronJob: latest?.job_name ?? null,
    lastCronStatus: latest?.status ?? null,
    lastHistoryPollAt,
    historyPollStale,
    recentJobErrors,
    ingestAbuseCount,
    ingestRateLimitElevated,
    checkedAt: new Date().toISOString(),
    recentJobRuns,
  };
}

export type AppStatusSummary = {
  healthy: boolean;
};

/** Latest cron health only — safe for the public homepage chip. */
export async function fetchAppStatusSummary(): Promise<AppStatusSummary | null> {
  try {
    const lastHistoryPollAt = await fetchLastSuccessfulCollectHistory();
    const healthy = !isCollectHistoryStale(lastHistoryPollAt);
    return { healthy };
  } catch {
    return null;
  }
}
