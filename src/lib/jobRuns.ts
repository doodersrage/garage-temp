import { createServerClient } from "./supabase";
import {
  RAW_READING_RETENTION_DAYS,
  shouldRunDailyRetention,
} from "./retentionSchedule";

export { RAW_READING_RETENTION_DAYS, shouldRunDailyRetention } from "./retentionSchedule";


export type JobRun = {
  id: number;
  job_name: string;
  status: "running" | "success" | "error";
  started_at: string;
  finished_at: string | null;
  detail: Record<string, unknown>;
};

export async function startJobRun(
  jobName: string,
  detail: Record<string, unknown> = {},
): Promise<number | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("job_runs")
    .insert({
      job_name: jobName,
      status: "running",
      detail,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to start job run:", error?.message);
    return null;
  }

  return data.id as number;
}

export async function finishJobRun(
  id: number | null,
  status: "success" | "error",
  detail: Record<string, unknown> = {},
): Promise<void> {
  if (id == null) return;
  const supabase = createServerClient();
  await supabase
    .from("job_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      detail,
    })
    .eq("id", id);
}

export async function listRecentJobRuns(
  limit = 50,
): Promise<{ runs: JobRun[]; error: string | null }> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("job_runs")
    .select("id, job_name, status, started_at, finished_at, detail")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { runs: [], error: error.message };
  }

  return { runs: (data ?? []) as JobRun[], error: null };
}

function hourBucket(iso: string): string {
  const d = new Date(iso);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}

/** Roll up numeric readings older than retention into hourly averages, then delete raw rows. */
export async function runSensorReadingRetention(
  retentionDays = RAW_READING_RETENTION_DAYS,
): Promise<{
  rolledUp: number;
  deleted: number;
  error: string | null;
}> {
  const supabase = createServerClient();
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays);
  const cutoffIso = cutoff.toISOString();

  const { data: oldRows, error } = await supabase
    .from("sensor_readings")
    .select("sensor_id, household_id, recorded_at, value_num")
    .lt("recorded_at", cutoffIso)
    .not("value_num", "is", null)
    .limit(20000);

  if (error) {
    return { rolledUp: 0, deleted: 0, error: error.message };
  }

  const buckets = new Map<
    string,
    {
      sensor_id: string;
      household_id: string;
      bucket_start: string;
      sum: number;
      min: number;
      max: number;
      count: number;
    }
  >();

  for (const row of oldRows ?? []) {
    if (row.value_num == null) continue;
    const bucket_start = hourBucket(row.recorded_at);
    const key = `${row.sensor_id}|${bucket_start}`;
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        sensor_id: row.sensor_id,
        household_id: row.household_id,
        bucket_start,
        sum: row.value_num,
        min: row.value_num,
        max: row.value_num,
        count: 1,
      });
    } else {
      existing.sum += row.value_num;
      existing.min = Math.min(existing.min, row.value_num);
      existing.max = Math.max(existing.max, row.value_num);
      existing.count += 1;
    }
  }

  const rollupRows = [...buckets.values()].map((b) => ({
    sensor_id: b.sensor_id,
    household_id: b.household_id,
    bucket_start: b.bucket_start,
    avg_num: b.sum / b.count,
    min_num: b.min,
    max_num: b.max,
    sample_count: b.count,
  }));

  let rolledUp = 0;
  if (rollupRows.length > 0) {
    const { error: upsertError } = await supabase
      .from("sensor_reading_rollups")
      .upsert(rollupRows, { onConflict: "sensor_id,bucket_start" });
    if (upsertError) {
      return { rolledUp: 0, deleted: 0, error: upsertError.message };
    }
    rolledUp = rollupRows.length;
  }

  const { error: deleteError, count } = await supabase
    .from("sensor_readings")
    .delete({ count: "exact" })
    .lt("recorded_at", cutoffIso);

  if (deleteError) {
    return { rolledUp, deleted: 0, error: deleteError.message };
  }

  return { rolledUp, deleted: count ?? 0, error: null };
}
