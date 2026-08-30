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

export const ALERT_EVENTS_EXPORT_MAX = 5000;

/** Alert events in [fromIso, toIso], oldest first, capped for export. */
export async function listAlertEventsInRange(
  userId: string,
  fromIso: string,
  toIso: string,
  limit = ALERT_EVENTS_EXPORT_MAX,
): Promise<AlertEventRow[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("alert_events")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data as AlertEventRow[];
}

export function buildAlertEventsCsv(events: AlertEventRow[]): string {
  const headers = [
    "created_at",
    "kind",
    "title",
    "body",
    "channels_sent",
    "channels_skipped",
    "acknowledged_at",
  ];

  const escape = (value: string): string => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const rows = events.map((event) =>
    [
      event.created_at,
      event.kind,
      event.title,
      event.body,
      (event.channels_sent ?? []).join("|"),
      (event.channels_skipped ?? []).join("|"),
      event.acknowledged_at ?? "",
    ]
      .map(escape)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
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
