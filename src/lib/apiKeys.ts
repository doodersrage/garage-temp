import { createServerClient } from "./supabase";

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomApiKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `gtm_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export type ApiKeyRow = {
  id: string;
  household_id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export async function listHouseholdApiKeys(
  householdId: string,
): Promise<ApiKeyRow[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("api_keys")
    .select("id, household_id, name, key_prefix, created_at, last_used_at, revoked_at")
    .eq("household_id", householdId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as ApiKeyRow[];
}

export async function createHouseholdApiKey(input: {
  householdId: string;
  name: string;
  createdBy: string;
}): Promise<{ plaintext: string | null; key: ApiKeyRow | null; error: string | null }> {
  const plaintext = randomApiKey();
  const key_hash = await sha256Hex(plaintext);
  const key_prefix = plaintext.slice(0, 10);
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      household_id: input.householdId,
      name: input.name.trim() || "Metrics key",
      key_prefix,
      key_hash,
      created_by: input.createdBy,
    })
    .select("id, household_id, name, key_prefix, created_at, last_used_at, revoked_at")
    .single();

  if (error || !data) {
    return { plaintext: null, key: null, error: error?.message ?? "Failed to create key" };
  }
  return { plaintext, key: data as ApiKeyRow, error: null };
}

export async function revokeHouseholdApiKey(
  householdId: string,
  keyId: string,
): Promise<{ error: string | null }> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("household_id", householdId);
  return { error: error?.message ?? null };
}

export async function resolveApiKey(
  bearer: string,
): Promise<{ householdId: string; keyId: string } | null> {
  const token = bearer.trim();
  if (!token.startsWith("gtm_")) return null;
  const key_hash = await sha256Hex(token);
  const supabase = createServerClient();
  const { data } = await supabase
    .from("api_keys")
    .select("id, household_id")
    .eq("key_hash", key_hash)
    .is("revoked_at", null)
    .maybeSingle();
  if (!data) return null;
  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  return { householdId: data.household_id, keyId: data.id };
}
