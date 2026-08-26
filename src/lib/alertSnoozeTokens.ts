import { createServerClient } from "./supabase";
import { snoozeUntilFromHours, vacationUntilFromDays } from "./alertSnooze";
import { getAlertSettingsForUser, saveAlertSettingsForUser } from "./notify";
import type { AlertSettings } from "./alerts";

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomSnoozeToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSnoozeToken(
  userId: string,
  hours = 24,
): Promise<string> {
  const token = randomSnoozeToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const supabase = createServerClient();
  await supabase.from("alert_snooze_tokens").insert({
    token,
    user_id: userId,
    hours,
    expires_at: expiresAt,
  });
  return token;
}

export async function applySnoozeToken(token: string): Promise<{ ok: boolean; message: string }> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("alert_snooze_tokens")
    .select("user_id, hours, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (!data || data.used_at) {
    return { ok: false, message: "Invalid or already used snooze link." };
  }
  if (Date.parse(data.expires_at) < Date.now()) {
    return { ok: false, message: "Snooze link expired." };
  }

  const settings = await getAlertSettingsForUser(data.user_id);
  const updated: AlertSettings = {
    ...settings,
    snoozeUntil: snoozeUntilFromHours(data.hours),
  };
  await saveAlertSettingsForUser(data.user_id, updated);
  await supabase
    .from("alert_snooze_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  return { ok: true, message: `Alerts snoozed for ${data.hours} hours.` };
}

export async function buildSnoozeUrl(baseUrl: string, userId: string, hours = 24): Promise<string> {
  const token = await createSnoozeToken(userId, hours);
  return `${baseUrl.replace(/\/$/, "")}/api/alerts/snooze?token=${token}`;
}

export async function applySnoozeForHouseholdMembers(
  householdId: string,
  hours: number,
): Promise<number> {
  const supabase = createServerClient();
  const { data: members } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdId);

  let count = 0;
  for (const member of members ?? []) {
    const settings = await getAlertSettingsForUser(member.user_id);
    await saveAlertSettingsForUser(member.user_id, {
      ...settings,
      snoozeUntil: snoozeUntilFromHours(hours),
    });
    count += 1;
  }
  return count;
}

export async function applyVacationForHouseholdMembers(
  householdId: string,
  days: number,
): Promise<number> {
  const supabase = createServerClient();
  const { data: members } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdId);

  let count = 0;
  for (const member of members ?? []) {
    const settings = await getAlertSettingsForUser(member.user_id);
    await saveAlertSettingsForUser(member.user_id, {
      ...settings,
      vacationUntil: vacationUntilFromDays(days),
    });
    count += 1;
  }
  return count;
}

export async function clearSnoozeForUser(userId: string): Promise<void> {
  const settings = await getAlertSettingsForUser(userId);
  await saveAlertSettingsForUser(userId, { ...settings, snoozeUntil: null });
}

export async function clearVacationForUser(userId: string): Promise<void> {
  const settings = await getAlertSettingsForUser(userId);
  await saveAlertSettingsForUser(userId, { ...settings, vacationUntil: null });
}

export async function clearSnoozeForHouseholdMembers(householdId: string): Promise<number> {
  const supabase = createServerClient();
  const { data: members } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdId);

  let count = 0;
  for (const member of members ?? []) {
    await clearSnoozeForUser(member.user_id);
    count += 1;
  }
  return count;
}

export async function clearVacationForHouseholdMembers(householdId: string): Promise<number> {
  const supabase = createServerClient();
  const { data: members } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdId);

  let count = 0;
  for (const member of members ?? []) {
    await clearVacationForUser(member.user_id);
    count += 1;
  }
  return count;
}

export { sha256Hex };
