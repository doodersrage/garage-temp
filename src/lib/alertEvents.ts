import { createServerClient } from "./supabase";

export type AlertEventRow = {
  id: number;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  channels_sent: string[];
  channels_skipped: string[];
  created_at: string;
  acknowledged_at: string | null;
};

export async function recordAlertEvent(input: {
  userId: string;
  kind: string;
  title: string;
  body: string;
  channelsSent: string[];
  channelsSkipped: string[];
}): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from("alert_events").insert({
    user_id: input.userId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    channels_sent: input.channelsSent,
    channels_skipped: input.channelsSkipped,
  });
  if (error) {
    console.error("Failed to record alert event:", error.message);
  }
}

export async function acknowledgeAlertEvent(
  userId: string,
  eventId: number,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("alert_events")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("user_id", userId)
    .is("acknowledged_at", null);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Acknowledge the most recent delivered alert that is still unhandled. */
export async function acknowledgeLatestUnackedAlert(
  userId: string,
): Promise<{ ok: boolean; eventId?: number; error?: string }> {
  const supabase = createServerClient();
  const { data, error: fetchError } = await supabase
    .from("alert_events")
    .select("id")
    .eq("user_id", userId)
    .is("acknowledged_at", null)
    .not("channels_sent", "eq", "{}")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) return { ok: false, error: fetchError.message };
  if (!data) return { ok: false, error: "No unhandled alerts." };

  const result = await acknowledgeAlertEvent(userId, data.id);
  if (!result.ok) return result;
  return { ok: true, eventId: data.id };
}

export async function listRecentAlertEvents(
  userId: string,
  limit = 20,
): Promise<AlertEventRow[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("alert_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as AlertEventRow[];
}

export async function countUnacknowledgedAlerts(userId: string): Promise<number> {
  const supabase = createServerClient();
  const { count } = await supabase
    .from("alert_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("acknowledged_at", null)
    .not("channels_sent", "eq", "{}");

  return count ?? 0;
}
