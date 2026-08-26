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
    .neq("channels_sent", "{}");

  return count ?? 0;
}
