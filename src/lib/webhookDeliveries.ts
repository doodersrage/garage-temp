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

// Momentary blips on the receiving end (a redeploying Zapier/n8n hook, a cold
// serverless function) are the most common real-world failure mode here, and
// this delivery can carry a freeze/leak alert -- so one retry is worth a short,
// bounded delay. Non-retryable statuses (4xx other than 408/429) mean the URL
// or auth is wrong, so a retry would just waste time.
const WEBHOOK_RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const WEBHOOK_MAX_ATTEMPTS = 2;
const WEBHOOK_RETRY_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deliverWebhookPost(
  userId: string | null | undefined,
  webhookType: "outbound_alert" | "reading",
  url: string,
  headers: Record<string, string>,
  body: string,
): Promise<Response | null> {
  const started = Date.now();
  let attempt = 0;
  let response: Response | null = null;
  let networkError: unknown = null;

  while (attempt < WEBHOOK_MAX_ATTEMPTS) {
    attempt += 1;
    networkError = null;
    try {
      response = await fetch(url, { method: "POST", headers, body });
      if (response.ok || !WEBHOOK_RETRYABLE_STATUS.has(response.status)) break;
    } catch (error) {
      networkError = error;
      response = null;
    }
    if (attempt < WEBHOOK_MAX_ATTEMPTS) {
      await sleep(WEBHOOK_RETRY_DELAY_MS);
    }
  }

  const retried = attempt > 1;

  if (response) {
    await recordWebhookDelivery({
      userId,
      webhookType,
      url,
      statusCode: response.status,
      success: response.ok,
      errorMessage: response.ok
        ? null
        : `HTTP ${response.status}${retried ? " (after retry)" : ""}`,
      durationMs: Date.now() - started,
    });
    return response;
  }

  await recordWebhookDelivery({
    userId,
    webhookType,
    url,
    statusCode: null,
    success: false,
    errorMessage:
      (networkError instanceof Error ? networkError.message : "fetch failed") +
      (retried ? " (after retry)" : ""),
    durationMs: Date.now() - started,
  });
  return null;
}
