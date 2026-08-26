import { createServerClient } from "./supabase";
import type { DoorOpenSession } from "./doorDuration";

export type DoorEventRow = {
  id: string;
  household_id: string;
  label: string;
  opened_at: string;
  closed_at: string | null;
  duration_ms: number | null;
};

export type DoorEventInsert = {
  household_id: string;
  sensor_id: string | null;
  label: string;
  opened_at: string;
  closed_at: string | null;
  duration_ms: number | null;
};

/** Build insert rows for closed sessions, skipping duplicates already in `existingKeys`. */
export function buildDoorEventRows(
  householdId: string,
  sessions: DoorOpenSession[],
  existingKeys: Set<string>,
  sensorIdByLabel?: Map<string, string>,
): DoorEventInsert[] {
  return sessions
    .filter((s) => !s.stillOpen && s.closedAt && s.durationMs != null)
    .filter((s) => !existingKeys.has(`${s.label}:${s.openedAt}`))
    .map((s) => ({
      household_id: householdId,
      sensor_id: sensorIdByLabel?.get(s.label) ?? null,
      label: s.label,
      opened_at: s.openedAt,
      closed_at: s.closedAt,
      duration_ms: s.durationMs,
    }));
}

export async function persistDoorSessions(
  householdId: string,
  sessions: DoorOpenSession[],
  sensorIdByLabel?: Map<string, string>,
): Promise<void> {
  const closed = sessions.filter((s) => !s.stillOpen && s.closedAt && s.durationMs != null);
  if (closed.length === 0) return;

  const supabase = createServerClient();
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: recent, error: fetchError } = await supabase
    .from("door_open_events")
    .select("label, opened_at")
    .eq("household_id", householdId)
    .gte("opened_at", since);

  if (fetchError) {
    throw new Error(`door_open_events fetch failed: ${fetchError.message}`);
  }

  const existing = new Set(
    (recent ?? []).map((r) => `${r.label}:${r.opened_at}`),
  );

  const rows = buildDoorEventRows(householdId, sessions, existing, sensorIdByLabel);
  if (rows.length === 0) return;

  const { error: insertError } = await supabase.from("door_open_events").insert(rows);
  if (insertError) {
    throw new Error(`door_open_events insert failed: ${insertError.message}`);
  }
}

export async function listDoorEvents(
  householdId: string,
  limit = 20,
): Promise<DoorEventRow[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("door_open_events")
    .select("id, household_id, label, opened_at, closed_at, duration_ms")
    .eq("household_id", householdId)
    .order("opened_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as DoorEventRow[];
}
