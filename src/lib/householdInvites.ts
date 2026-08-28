import { createServerClient } from "./supabase";
import { addHouseholdMemberByUserId, setActiveHouseholdForUser } from "./households";

export type HouseholdInvite = {
  id: string;
  household_id: string;
  email: string;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  role: "member" | "viewer" | "alert_only" | "property_manager";
};

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createHouseholdInvite(
  householdId: string,
  email: string,
  invitedBy: string,
  expiresInDays = 7,
  role: "member" | "viewer" | "alert_only" | "property_manager" = "member",
): Promise<{ invite: HouseholdInvite | null; error: string | null }> {
  const supabase = createServerClient();
  const normalized = email.trim().toLowerCase();
  const expires_at = new Date(
    Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("household_invites")
    .insert({
      household_id: householdId,
      email: normalized,
      token: randomToken(),
      invited_by: invitedBy,
      expires_at,
      role,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { invite: null, error: error?.message ?? "Failed to create invite" };
  }

  return { invite: data as HouseholdInvite, error: null };
}

export async function listPendingInvites(
  householdId: string,
): Promise<{ invites: HouseholdInvite[]; error: string | null }> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("household_invites")
    .select("*")
    .eq("household_id", householdId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    return { invites: [], error: error.message };
  }

  return { invites: (data ?? []) as HouseholdInvite[], error: null };
}

export async function getInviteByToken(
  token: string,
): Promise<HouseholdInvite | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("household_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  return (data as HouseholdInvite | null) ?? null;
}

export async function acceptHouseholdInvite(
  token: string,
  userId: string,
  userEmail: string | null | undefined,
): Promise<{ householdId: string | null; error: string | null }> {
  const invite = await getInviteByToken(token);
  if (!invite) {
    return { householdId: null, error: "Invite not found" };
  }

  if (invite.accepted_at) {
    return { householdId: invite.household_id, error: null };
  }

  if (Date.parse(invite.expires_at) < Date.now()) {
    return { householdId: null, error: "Invite expired" };
  }

  if (
    userEmail &&
    invite.email.toLowerCase() !== userEmail.trim().toLowerCase()
  ) {
    return {
      householdId: null,
      error: "Sign in with the invited email address to accept",
    };
  }

  const role =
    invite.role === "viewer" ||
    invite.role === "alert_only" ||
    invite.role === "property_manager"
      ? invite.role
      : "member";
  const add = await addHouseholdMemberByUserId(
    invite.household_id,
    userId,
    role,
  );
  if (add.error) {
    return { householdId: null, error: add.error };
  }

  await setActiveHouseholdForUser(userId, invite.household_id);

  const supabase = createServerClient();
  await supabase
    .from("household_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return { householdId: invite.household_id, error: null };
}

export async function revokeHouseholdInvite(
  householdId: string,
  inviteId: string,
): Promise<{ error: string | null }> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("household_invites")
    .delete()
    .eq("id", inviteId)
    .eq("household_id", householdId)
    .is("accepted_at", null);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function sendInviteEmail(
  to: string,
  acceptUrl: string,
  householdName: string,
  invitedByEmail: string | null,
): Promise<void> {
  try {
    const { sendPlainEmail } = await import("./mailer");
    await sendPlainEmail(
      to,
      `You're invited to ${householdName}`,
      [
        `${invitedByEmail ?? "Someone"} invited you to share garage sensors on ThermalTrace.`,
        "",
        `Household: ${householdName}`,
        `Accept invite: ${acceptUrl}`,
        "",
        "This link expires in 7 days. Sign in (or register) with this email address to join.",
      ].join("\n"),
    );
  } catch (error) {
    console.error("Failed to send household invite email:", error);
  }
}
