import { createServerClient } from "./supabase";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function recordIngestStat(
  deviceId: string,
  success: boolean,
): Promise<void> {
  const supabase = createServerClient();
  const day = todayUtc();
  const column = success ? "success_count" : "error_count";

  const { data: existing } = await supabase
    .from("ingest_stats")
    .select("success_count, error_count")
    .eq("device_id", deviceId)
    .eq("day", day)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("ingest_stats")
      .update({ [column]: (existing[column] ?? 0) + 1 })
      .eq("device_id", deviceId)
      .eq("day", day);
  } else {
    await supabase.from("ingest_stats").insert({
      device_id: deviceId,
      day,
      success_count: success ? 1 : 0,
      error_count: success ? 0 : 1,
    });
  }
}

export type IngestStatRow = {
  device_id: string;
  day: string;
  success_count: number;
  error_count: number;
  device_name?: string;
};

export async function listIngestStatsForHousehold(
  householdId: string,
  days = 7,
): Promise<IngestStatRow[]> {
  const supabase = createServerClient();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const sinceDay = since.toISOString().slice(0, 10);

  const { data: devices } = await supabase
    .from("devices")
    .select("id, name")
    .eq("household_id", householdId);

  if (!devices || devices.length === 0) return [];

  const ids = devices.map((d) => d.id);
  const nameById = new Map(devices.map((d) => [d.id, d.name]));

  const { data } = await supabase
    .from("ingest_stats")
    .select("device_id, day, success_count, error_count")
    .in("device_id", ids)
    .gte("day", sinceDay)
    .order("day", { ascending: false });

  return (data ?? []).map((row) => ({
    ...row,
    device_name: nameById.get(row.device_id) ?? "Device",
  })) as IngestStatRow[];
}
