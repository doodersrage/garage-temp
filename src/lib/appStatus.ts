import { createAdminClient } from "./supabase";
import { listRecentIngestStatsAdmin } from "./ingestStats";
import { flagIngestAbuse } from "./ingestAbuse";
import { listRecentJobRuns, type JobRun } from "./jobRuns";

export type AppStatus = {
  healthy: boolean;
  lastCronAt: string | null;
  lastCronJob: string | null;
  lastCronStatus: string | null;
  recentJobErrors: number;
  ingestAbuseCount: number;
  checkedAt: string;
  recentJobRuns: JobRun[];
};

export async function fetchAppStatus(): Promise<AppStatus> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: jobs } = await admin
    .from("job_runs")
    .select("job_name, status, started_at")
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(50);

  const latest = jobs?.[0] ?? null;
  const recentJobErrors =
    jobs?.filter((job) => job.status === "error").length ?? 0;
  const ingestStats = await listRecentIngestStatsAdmin(1);
  const ingestAbuseCount = flagIngestAbuse(ingestStats).length;
  const { runs: recentJobRuns } = await listRecentJobRuns(14);

  const healthy =
    recentJobErrors === 0 &&
    latest != null &&
    latest.status === "success" &&
    Date.now() - Date.parse(latest.started_at) < 2 * 60 * 60 * 1000;

  return {
    healthy,
    lastCronAt: latest?.started_at ?? null,
    lastCronJob: latest?.job_name ?? null,
    lastCronStatus: latest?.status ?? null,
    recentJobErrors,
    ingestAbuseCount,
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
    const admin = createAdminClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: jobs, error } = await admin
      .from("job_runs")
      .select("status, started_at")
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(1);

    if (error) return null;

    const latest = jobs?.[0] ?? null;
    const healthy =
      latest != null &&
      latest.status === "success" &&
      Date.now() - Date.parse(latest.started_at) < 2 * 60 * 60 * 1000;

    return { healthy };
  } catch {
    return null;
  }
}
