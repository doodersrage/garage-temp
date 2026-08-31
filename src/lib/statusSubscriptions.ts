import { createServerClient } from "./supabase";
import { sendEmail } from "./mailer";
import { brandedEmailParts } from "./emailLayout";
import { resolveSiteUrl } from "./schemaMarkup";

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function normalizeStatusEmail(email: string): string {
  return email.trim().toLowerCase();
}

function confirmUrl(token: string): string {
  return `${resolveSiteUrl(null)}/api/status/confirm?token=${token}`;
}

function unsubscribeUrl(token: string): string {
  return `${resolveSiteUrl(null)}/api/status/unsubscribe?token=${token}`;
}

async function sendConfirmEmail(email: string, token: string): Promise<void> {
  const { text, html } = brandedEmailParts({
    eyebrow: "Status updates",
    title: "Confirm your subscription",
    intro:
      "Click below to start receiving an email whenever ThermalTrace's system status changes.",
    paragraphs: [
      "If you didn't request this, you can ignore this message -- you won't be subscribed unless you confirm.",
    ],
    cta: { label: "Confirm subscription", url: confirmUrl(token) },
    footerNote:
      "You're receiving this because someone entered this address on the ThermalTrace status page. Confirming subscribes you to status-change emails only.",
  });

  await sendEmail(email, "Confirm your ThermalTrace status subscription", text, {
    html,
  });
}

/**
 * Subscribe (or re-send confirmation for) an email address. Always
 * "succeeds" from the caller's point of view unless there's a hard error --
 * an already-confirmed address is left alone (no duplicate email), and a
 * caller has no way to distinguish "new subscriber" from "already
 * subscribed" from the response, which avoids leaking who's on the list.
 */
export async function subscribeToStatusUpdates(
  rawEmail: string,
): Promise<{ ok: boolean; error?: string }> {
  const email = normalizeStatusEmail(rawEmail);
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const supabase = createServerClient();
  const { data: existing, error: lookupError } = await supabase
    .from("status_subscriptions")
    .select("id, token, confirmed_at")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    console.error("status subscribe lookup failed:", lookupError.message);
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  if (existing?.confirmed_at) {
    // Already subscribed and confirmed -- nothing to do, don't re-email.
    return { ok: true };
  }

  const token = randomToken();

  if (existing) {
    const { error } = await supabase
      .from("status_subscriptions")
      .update({ token })
      .eq("id", existing.id);
    if (error) {
      console.error("status subscribe token rotate failed:", error.message);
      return { ok: false, error: "Something went wrong. Please try again." };
    }
  } else {
    const { error } = await supabase.from("status_subscriptions").insert({
      email,
      token,
    });
    if (error) {
      console.error("status subscribe insert failed:", error.message);
      return { ok: false, error: "Something went wrong. Please try again." };
    }
  }

  try {
    await sendConfirmEmail(email, token);
  } catch (error) {
    console.error("Failed to send status confirm email:", error);
    // The row exists either way; the confirm link still works if the user
    // finds it. Don't fail the request over a transient send error.
  }

  return { ok: true };
}

export async function confirmStatusSubscription(
  token: string,
): Promise<{ ok: boolean; message: string }> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("status_subscriptions")
    .select("id, confirmed_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Invalid or expired confirmation link." };
  }

  if (!data.confirmed_at) {
    await supabase
      .from("status_subscriptions")
      .update({ confirmed_at: new Date().toISOString() })
      .eq("id", data.id);
  }

  return { ok: true, message: "You're subscribed to status updates." };
}

export async function unsubscribeStatusSubscription(
  token: string,
): Promise<{ ok: boolean; message: string }> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("status_subscriptions")
    .select("id")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Invalid or already-used unsubscribe link." };
  }

  await supabase.from("status_subscriptions").delete().eq("id", data.id);
  return { ok: true, message: "You've been unsubscribed from status updates." };
}

export type ConfirmedStatusSubscriber = { email: string; token: string };

export async function listConfirmedStatusSubscribers(): Promise<
  ConfirmedStatusSubscriber[]
> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("status_subscriptions")
    .select("email, token")
    .not("confirmed_at", "is", null);

  if (error) {
    console.error("Failed to list status subscribers:", error.message);
    return [];
  }

  return (data ?? []) as ConfirmedStatusSubscriber[];
}

export { unsubscribeUrl as buildStatusUnsubscribeUrl };
