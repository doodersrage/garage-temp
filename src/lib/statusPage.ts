import { createServerClient } from "./supabase";
import { listHouseholdDevices } from "./devices";
import { fetchLatestSensorValues } from "./sensorReadings";
import { formatRelativeAge, STALE_MS } from "./relativeTime";

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type StatusPageToken = {
  id: string;
  household_id: string;
  token: string;
  label: string;
  created_at: string;
  revoked_at: string | null;
};

export async function createStatusPageToken(
  householdId: string,
  label: string,
): Promise<{ token: string | null; error: string | null }> {
  const supabase = createServerClient();
  const token = randomToken();
  const { error } = await supabase.from("status_page_tokens").insert({
    household_id: householdId,
    token,
    label: label.trim() || "Status page",
  });
  return { token: error ? null : token, error: error?.message ?? null };
}

export async function listStatusPageTokens(
  householdId: string,
): Promise<StatusPageToken[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("status_page_tokens")
    .select("id, household_id, token, label, created_at, revoked_at")
    .eq("household_id", householdId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as StatusPageToken[];
}

export async function revokeStatusPageToken(
  householdId: string,
  id: string,
): Promise<void> {
  const supabase = createServerClient();
  await supabase
    .from("status_page_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("household_id", householdId);
}

export async function resolveStatusPageToken(
  token: string,
): Promise<{ householdId: string } | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("status_page_tokens")
    .select("household_id")
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();
  return data ? { householdId: data.household_id } : null;
}

export async function buildStatusPageSnapshot(householdId: string) {
  const [{ devices }, latest] = await Promise.all([
    listHouseholdDevices(householdId),
    fetchLatestSensorValues(householdId),
  ]);

  const newest = latest
    .map((r) => r.recorded_at)
    .filter(Boolean)
    .sort((a, b) => Date.parse(b!) - Date.parse(a!))[0] ?? null;
  const age = formatRelativeAge(newest);
  const staleCount = latest.filter((row) => {
    if (!row.recorded_at) return true;
    return Date.now() - Date.parse(row.recorded_at) >= STALE_MS;
  }).length;

  return {
    updatedAt: newest,
    lastReadingLabel: age.label,
    stale: !newest || age.stale,
    staleSensorCount: staleCount,
    sensorCount: latest.length,
    deviceCount: devices.length,
    sensors: latest.slice(0, 24).map((row) => ({
      label: row.sensor.label,
      kind: row.sensor.kind,
      device: row.deviceName,
      value_num: row.value_num,
      value_bool: row.value_bool,
      recorded_at: row.recorded_at,
    })),
  };
}
