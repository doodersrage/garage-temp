import { createServerClient } from "./supabase";
import type { ClaimsPackData } from "./claimsPack";

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * SHA-256 over an explicit, stable subset of the pack's substantive fields --
 * computed *before* verifyUrl/contentHash are added to the data, so the hash
 * never includes itself. Not a cryptographic signature (no secret key
 * involved) -- just tamper-evidence: re-hashing the persisted pack_data
 * later should reproduce this same value.
 */
export async function computeClaimsPackHash(pack: ClaimsPackData): Promise<string> {
  const canonical = {
    householdLabel: pack.householdLabel,
    rangeFrom: pack.rangeFrom,
    rangeTo: pack.rangeTo,
    freezeThresholdF: pack.freezeThresholdF,
    freezeHours: pack.freezeHours,
    probes: pack.probes,
    devices: pack.devices,
    events: pack.events,
    exportedAt: pack.exportedAt,
  };
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(canonical)),
  );
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createClaimsPackExport(
  householdId: string,
  pack: ClaimsPackData,
  generatedBy: string | null,
): Promise<{ token: string | null; contentHash: string | null; error: string | null }> {
  const contentHash = await computeClaimsPackHash(pack);
  const token = randomToken();
  const supabase = createServerClient();
  const { error } = await supabase.from("claims_pack_exports").insert({
    household_id: householdId,
    token,
    range_from: pack.rangeFrom,
    range_to: pack.rangeTo,
    content_hash: contentHash,
    pack_data: pack,
    generated_by: generatedBy,
    expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error) {
    return { token: null, contentHash: null, error: error.message };
  }
  return { token, contentHash, error: null };
}

export async function getClaimsPackExportByToken(
  token: string,
): Promise<ClaimsPackData | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("claims_pack_exports")
    .select("pack_data, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle();
  if (!data || data.revoked_at) return null;
  if (data.expires_at && Date.parse(data.expires_at) < Date.now()) return null;
  return data.pack_data as ClaimsPackData;
}

export async function revokeClaimsPackExport(
  householdId: string,
  token: string,
): Promise<boolean> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("claims_pack_exports")
    .update({ revoked_at: new Date().toISOString() })
    .eq("household_id", householdId)
    .eq("token", token)
    .is("revoked_at", null);
  return !error;
}
