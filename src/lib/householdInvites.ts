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

  const add = await addHouseholdMemberByUserId(
    invite.household_id,
    userId,
    "member",
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

export async function sendInviteEmail(
  to: string,
  acceptUrl: string,
  householdName: string,
  invitedByEmail: string | null,
): Promise<void> {
  try {
    const { EmailMessage } = await import("cloudflare:email");
    const { createMimeMessage } = await import("mimetext");
    const { env } = await import("cloudflare:workers");

    const msg = createMimeMessage();
    msg.setSender({
      name: "Garage Temp Monitor",
      addr: import.meta.env.SMTP_MAIL_FROM,
    });
    msg.setRecipient(to);
    msg.setSubject(`You're invited to ${householdName}`);
    msg.addMessage({
      contentType: "text/plain",
      data: [
        `${invitedByEmail ?? "Someone"} invited you to share garage sensors on Garage Temperature Monitor.`,
        "",
        `Household: ${householdName}`,
        `Accept invite: ${acceptUrl}`,
        "",
        "This link expires in 7 days. Sign in (or register) with this email address to join.",
      ].join("\n"),
    });

    const mail = new EmailMessage(
      import.meta.env.SMTP_MAIL_FROM,
      to,
      msg.asRaw(),
    );
    await env.MAILER.send(mail);
  } catch (error) {
    console.error("Failed to send household invite email:", error);
  }
}
