import { createServerClient } from "./supabase";
import { RAW_READING_RETENTION_DAYS } from "./retentionSchedule";

export type ArchiveResult = {
  archived: number;
  skipped: boolean;
  error: string | null;
};

/** Export aged readings to archive metadata (R2 upload when binding present). */
export async function archiveOldReadings(options?: {
  r2?: R2Bucket;
  retentionDays?: number;
}): Promise<ArchiveResult> {
  const retentionDays = options?.retentionDays ?? RAW_READING_RETENTION_DAYS;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const supabase = createServerClient();

  const { data: households, error } = await supabase
    .from("households")
    .select("id")
    .limit(500);

  if (error) {
    return { archived: 0, skipped: false, error: error.message };
  }

  if (!options?.r2) {
    return { archived: 0, skipped: true, error: null };
  }

  let archived = 0;

  for (const household of households ?? []) {
    const { data: readings } = await supabase
      .from("sensor_readings")
      .select("id, value_num, recorded_at, sensor_id")
      .lt("recorded_at", cutoff.toISOString())
      .limit(5000);

    if (!readings?.length) continue;

    const key = `archives/${household.id}/${cutoff.toISOString().slice(0, 10)}.json`;
    await options.r2.put(key, JSON.stringify(readings), {
      httpMetadata: { contentType: "application/json" },
    });

    await supabase.from("history_archives").insert({
      household_id: household.id,
      period_start: cutoff.toISOString().slice(0, 10),
      period_end: new Date().toISOString().slice(0, 10),
      object_key: key,
      row_count: readings.length,
    });

    archived += readings.length;
  }

  return { archived, skipped: false, error: null };
}
