import { createServerClient } from "./supabase";
import { randomSigningSecret } from "./inboundSigning";

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `gtw_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export type InboundWebhook = {
  id: string;
  household_id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
  has_signing_secret: boolean;
};

export async function createInboundWebhook(
  householdId: string,
  userId: string,
  name: string,
): Promise<{ token: string | null; signingSecret: string | null; error: string | null }> {
  const token = randomToken();
  const signingSecret = randomSigningSecret();
  const token_hash = await sha256Hex(token);
  const token_prefix = token.slice(0, 12);
  const supabase = createServerClient();
  const { error } = await supabase.from("inbound_webhooks").insert({
    household_id: householdId,
    name: name.trim() || "Inbound webhook",
    token_prefix,
    token_hash,
    created_by: userId,
    signing_secret: signingSecret,
  });
  return {
    token: error ? null : token,
    signingSecret: error ? null : signingSecret,
    error: error?.message ?? null,
  };
}

export async function listInboundWebhooks(
  householdId: string,
): Promise<{ webhooks: InboundWebhook[]; error: string | null }> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("inbound_webhooks")
    .select("id, household_id, name, token_prefix, created_at, last_used_at, signing_secret")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });
  return {
    webhooks: (data ?? []).map((row) => ({
      id: row.id,
      household_id: row.household_id,
      name: row.name,
      token_prefix: row.token_prefix,
      created_at: row.created_at,
      last_used_at: row.last_used_at,
      has_signing_secret: Boolean(row.signing_secret),
    })) as InboundWebhook[],
    error: error?.message ?? null,
  };
}

export async function revokeInboundWebhook(
  webhookId: string,
  householdId: string,
): Promise<{ error: string | null }> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("inbound_webhooks")
    .delete()
    .eq("id", webhookId)
    .eq("household_id", householdId);
  return { error: error?.message ?? null };
}

export async function resolveInboundWebhook(
  token: string,
): Promise<{ householdId: string; webhookId: string; signingSecret: string | null } | null> {
  const token_hash = await sha256Hex(token.trim());
  const supabase = createServerClient();
  const { data } = await supabase
    .from("inbound_webhooks")
    .select("id, household_id, signing_secret")
    .eq("token_hash", token_hash)
    .maybeSingle();
  if (!data) return null;
  await supabase
    .from("inbound_webhooks")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  return {
    householdId: data.household_id,
    webhookId: data.id,
    signingSecret: data.signing_secret ?? null,
  };
}
