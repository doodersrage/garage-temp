import { createServerClient } from "./supabase";
import { timingSafeEqualHex } from "./timingSafeEqual";
import {
  isBayMood,
  isValidBayId,
  resolveBayMood,
  type BayMood,
} from "./bayMood";
import { fetchLatestSensorValues } from "./sensorReadings";
import { DEFAULT_ALERT_SETTINGS, rowToAlertSettings } from "./alerts";

const DEVICE_ID_RE = /^[0-9a-f]{32}$/;
const SECRET_RE = /^[0-9a-f]{64}$/;

export type PuckRow = {
  device_id: string;
  household_id: string;
  secret_hex: string;
  bay_id: string | null;
  space_name: string | null;
  mood_override: string | null;
  mood_override_at: string | null;
};

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function hmacSha256Hex(
  secretHex: string,
  nonceHex: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    hexToBytes(secretHex),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, hexToBytes(nonceHex));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function normalizeDeviceId(value: string): string | null {
  const id = value.trim().toLowerCase();
  return DEVICE_ID_RE.test(id) ? id : null;
}

export function normalizeSecretHex(value: string): string | null {
  const secret = value.trim().toLowerCase();
  return SECRET_RE.test(secret) ? secret : null;
}

export async function registerPuck(input: {
  deviceId: string;
  secretHex: string;
  householdId: string;
  createdBy: string;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const deviceId = normalizeDeviceId(input.deviceId);
  const secretHex = normalizeSecretHex(input.secretHex);
  if (!deviceId || !secretHex) {
    return { ok: false, error: "bad_register", status: 400 };
  }

  const supabase = createServerClient();
  const { data: existing } = await supabase
    .from("pucks")
    .select("device_id, household_id")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (existing && existing.household_id !== input.householdId) {
    return { ok: false, error: "device_owned", status: 409 };
  }

  const { error } = await supabase.from("pucks").upsert(
    {
      device_id: deviceId,
      household_id: input.householdId,
      secret_hex: secretHex,
      created_by: input.createdBy,
      updated_at: new Date().toISOString(),
      ...(existing
        ? {}
        : { bay_id: null, space_name: null, mood_override: null }),
    },
    { onConflict: "device_id" },
  );

  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }
  return { ok: true };
}

export async function getPuck(deviceId: string): Promise<PuckRow | null> {
  const id = normalizeDeviceId(deviceId);
  if (!id) return null;
  const supabase = createServerClient();
  const { data } = await supabase
    .from("pucks")
    .select(
      "device_id, household_id, secret_hex, bay_id, space_name, mood_override, mood_override_at",
    )
    .eq("device_id", id)
    .maybeSingle();
  return (data as PuckRow | null) ?? null;
}

export async function startPuckClaim(input: {
  deviceId: string;
  bayId: string;
  householdId: string;
}): Promise<
  | { ok: true; nonceHex: string; expiresIn: number }
  | { ok: false; error: string; status: number }
> {
  const deviceId = normalizeDeviceId(input.deviceId);
  if (!deviceId || !isValidBayId(input.bayId)) {
    return { ok: false, error: "bad_start", status: 400 };
  }

  const puck = await getPuck(deviceId);
  if (!puck || puck.household_id !== input.householdId) {
    return { ok: false, error: "unknown_device", status: 404 };
  }

  const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
  const nonceHex = [...nonceBytes]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expiresAt = new Date(Date.now() + 60_000).toISOString();

  const supabase = createServerClient();
  const { error } = await supabase.from("puck_claim_pending").upsert({
    device_id: deviceId,
    bay_id: input.bayId,
    nonce_hex: nonceHex,
    expires_at: expiresAt,
  });

  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }

  return { ok: true, nonceHex, expiresIn: 60 };
}

export async function finishPuckClaim(input: {
  deviceId: string;
  bayId: string;
  nonceHex: string;
  responseHex: string;
  spaceName: string;
  householdId: string;
}): Promise<
  | { ok: true; bayId: string; spaceName: string }
  | { ok: false; error: string; status: number }
> {
  const deviceId = normalizeDeviceId(input.deviceId);
  const nonceHex = input.nonceHex.trim().toLowerCase();
  const responseHex = input.responseHex.trim().toLowerCase();
  if (
    !deviceId ||
    !isValidBayId(input.bayId) ||
    !/^[0-9a-f]{16,128}$/.test(nonceHex) ||
    !/^[0-9a-f]{64}$/.test(responseHex)
  ) {
    return { ok: false, error: "bad_finish", status: 400 };
  }

  const puck = await getPuck(deviceId);
  if (!puck || puck.household_id !== input.householdId) {
    return { ok: false, error: "unknown_device", status: 404 };
  }

  const supabase = createServerClient();
  const { data: pending } = await supabase
    .from("puck_claim_pending")
    .select("bay_id, nonce_hex, expires_at")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (!pending) {
    return { ok: false, error: "no_pending", status: 400 };
  }
  if (pending.bay_id !== input.bayId || pending.nonce_hex !== nonceHex) {
    return { ok: false, error: "mismatch", status: 400 };
  }
  if (new Date(pending.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "expired", status: 400 };
  }

  const expect = await hmacSha256Hex(puck.secret_hex, nonceHex);
  if (!timingSafeEqualHex(expect, responseHex)) {
    return { ok: false, error: "bad_mac", status: 401 };
  }

  const spaceName = input.spaceName.trim().slice(0, 64) || input.bayId;
  const now = new Date().toISOString();

  const { error: bindError } = await supabase
    .from("pucks")
    .update({
      bay_id: input.bayId,
      space_name: spaceName,
      updated_at: now,
      mood_override: null,
      mood_override_at: null,
    })
    .eq("device_id", deviceId)
    .eq("household_id", input.householdId);

  if (bindError) {
    return { ok: false, error: bindError.message, status: 500 };
  }

  await supabase.from("puck_claim_pending").delete().eq("device_id", deviceId);

  return { ok: true, bayId: input.bayId, spaceName };
}

export async function setBayMoodOverride(input: {
  bayId: string;
  householdId: string;
  mood: BayMood;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!isValidBayId(input.bayId) || !isBayMood(input.mood)) {
    return { ok: false, error: "bad_mood", status: 400 };
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("pucks")
    .update({
      mood_override: input.mood,
      mood_override_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("household_id", input.householdId)
    .eq("bay_id", input.bayId)
    .select("device_id");

  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "bay_not_claimed", status: 404 };
  }
  return { ok: true };
}

export async function resolveBayMoodForHousehold(input: {
  bayId: string;
  householdId: string;
}): Promise<
  | {
      ok: true;
      bayId: string;
      mood: BayMood;
      spaceName: string;
      updatedAt: number;
      source: "override" | "sensors" | "default";
    }
  | { ok: false; error: string; status: number }
> {
  if (!isValidBayId(input.bayId)) {
    return { ok: false, error: "bad_bay", status: 400 };
  }

  const supabase = createServerClient();
  const { data: puck } = await supabase
    .from("pucks")
    .select("space_name, mood_override, mood_override_at")
    .eq("household_id", input.householdId)
    .eq("bay_id", input.bayId)
    .maybeSingle();

  if (!puck) {
    return { ok: false, error: "bay_not_claimed", status: 404 };
  }

  const spaceName =
    (typeof puck.space_name === "string" && puck.space_name) || input.bayId;

  if (puck.mood_override && isBayMood(puck.mood_override)) {
    const updatedAt = puck.mood_override_at
      ? Math.floor(new Date(puck.mood_override_at).getTime() / 1000)
      : Math.floor(Date.now() / 1000);
    return {
      ok: true,
      bayId: input.bayId,
      mood: puck.mood_override,
      spaceName,
      updatedAt,
      source: "override",
    };
  }

  let alertSettings = DEFAULT_ALERT_SETTINGS;
  const { data: owner } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", input.householdId)
    .eq("role", "owner")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (owner?.user_id) {
    const { data: alertRow } = await supabase
      .from("alert_settings")
      .select("*")
      .eq("user_id", owner.user_id)
      .maybeSingle();
    alertSettings = rowToAlertSettings(
      (alertRow as Record<string, unknown> | null) ?? null,
    );
  }
  const freezeThreshold = alertSettings.freezeThresholdF;
  const staleMs = Math.max(1, alertSettings.outageHours) * 3600_000;

  const latest = await fetchLatestSensorValues(input.householdId);
  const bayKey = input.bayId.toLowerCase();
  const inBay = latest.filter(
    (row) => (row.deviceSpace ?? "").trim().toLowerCase() === bayKey,
  );

  let wetContact = false;
  let doorOpen = false;
  let coldest: number | null = null;
  let newestMs = 0;

  for (const row of inBay) {
    const recorded = row.recorded_at ? Date.parse(row.recorded_at) : 0;
    if (recorded > newestMs) newestMs = recorded;
    if (row.sensor.kind === "flood" && row.value_bool === true) {
      wetContact = true;
    }
    if (row.sensor.kind === "door" && row.value_bool === true) {
      doorOpen = true;
    }
    if (
      row.sensor.kind === "temperature" &&
      typeof row.value_num === "number" &&
      Number.isFinite(row.value_num)
    ) {
      coldest = coldest == null ? row.value_num : Math.min(coldest, row.value_num);
    }
  }

  const feedHealthy = inBay.length > 0 && Date.now() - newestMs <= staleMs;
  const freezeMarginF =
    coldest == null ? null : coldest - freezeThreshold;

  const mood = resolveBayMood({
    wetContact,
    feedHealthy,
    freezeMarginF,
    doorOpen,
  });

  return {
    ok: true,
    bayId: input.bayId,
    mood,
    spaceName,
    updatedAt: Math.floor((newestMs || Date.now()) / 1000),
    source: inBay.length > 0 ? "sensors" : "default",
  };
}
