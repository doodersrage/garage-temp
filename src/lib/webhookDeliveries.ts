import { createServerClient } from "./supabase";

export type WebhookDeliveryRow = {
  id: string;
  webhook_type: string;
  url_host: string;
  status_code: number | null;
  success: boolean;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
};

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "unknown";
  }
}

export async function recordWebhookDelivery(input: {
  userId: string | null | undefined;
  webhookType: "outbound_alert" | "reading";
  url: string;
  statusCode: number | null;
  success: boolean;
  errorMessage?: string | null;
  durationMs?: number | null;
}): Promise<void> {
  if (!input.userId) return;

  const supabase = createServerClient();
  const { error } = await supabase.from("webhook_deliveries").insert({
    user_id: input.userId,
    webhook_type: input.webhookType,
    url_host: hostFromUrl(input.url),
    status_code: input.statusCode,
    success: input.success,
    error_message: input.errorMessage ?? null,
    duration_ms: input.durationMs ?? null,
  });

  if (error) {
    console.error("Failed to record webhook delivery:", error.message);
  }
}

export async function listRecentWebhookDeliveries(
  userId: string,
  limit = 15,
): Promise<WebhookDeliveryRow[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("webhook_deliveries")
    .select(
      "id, webhook_type, url_host, status_code, success, error_message, duration_ms, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as WebhookDeliveryRow[];
}

export async function deliverWebhookPost(
  userId: string | null | undefined,
  webhookType: "outbound_alert" | "reading",
  url: string,
  headers: Record<string, string>,
  body: string,
): Promise<Response | null> {
  const started = Date.now();
  try {
    const response = await fetch(url, { method: "POST", headers, body });
    await recordWebhookDelivery({
      userId,
      webhookType,
      url,
      statusCode: response.status,
      success: response.ok,
      errorMessage: response.ok ? null : `HTTP ${response.status}`,
      durationMs: Date.now() - started,
    });
    return response;
  } catch (error) {
    await recordWebhookDelivery({
      userId,
      webhookType,
      url,
      statusCode: null,
      success: false,
      errorMessage: error instanceof Error ? error.message : "fetch failed",
      durationMs: Date.now() - started,
    });
    return null;
  }
}
