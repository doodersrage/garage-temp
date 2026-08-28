import type { AlertSettings } from "./alerts";
import { deliverWebhookPost } from "./webhookDeliveries";

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sendReadingWebhook(
  userId: string | null | undefined,
  settings: Pick<AlertSettings, "readingWebhookUrl" | "readingWebhookSecret">,
  payload: Record<string, unknown>,
): Promise<void> {
  const url = settings.readingWebhookUrl?.trim();
  if (!url) return;

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "ThermalTrace/1.0",
  };

  const secret = settings.readingWebhookSecret?.trim();
  if (secret) {
    const signature = await hmacSha256Hex(secret, body);
    headers["X-GarageTemp-Signature"] = `sha256=${signature}`;
  }

  await deliverWebhookPost(userId, "reading", url, headers, body);
}
