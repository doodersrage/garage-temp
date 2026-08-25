import { createServerClient } from "./supabase";

export type HouseholdRole = "owner" | "member";

export type Household = {
  id: string;
  name: string;
  created_at: string;
};

export type HouseholdMember = {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  created_at: string;
  email?: string | null;
};

export async function getOrCreateHouseholdForUser(
  userId: string,
  email?: string | null,
): Promise<{ householdId: string; error: string | null }> {
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing?.household_id) {
    return { householdId: existing.household_id, error: null };
  }

  const name = `${(email ?? "My").split("@")[0]}'s household`;
  const { data: household, error: createError } = await supabase
    .from("households")
    .insert({ name })
    .select("id")
    .single();

  if (createError || !household) {
    return { householdId: "", error: createError?.message ?? "Failed to create household" };
  }

  const { error: memberError } = await supabase.from("household_members").insert({
    household_id: household.id,
    user_id: userId,
    role: "owner",
  });

  if (memberError) {
    return { householdId: "", error: memberError.message };
  }

  return { householdId: household.id, error: null };
}

export async function getUserHouseholdId(
  userId: string,
): Promise<string | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (!data || data.length === 0) return null;

  const owner = data.find((row) => row.role === "owner");
  return (owner ?? data[0]).household_id;
}

export async function listHouseholdMembers(
  householdId: string,
): Promise<{ members: HouseholdMember[]; error: string | null }> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("household_members")
    .select("id, household_id, user_id, role, created_at")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });

  if (error) {
    return { members: [], error: error.message };
  }

  return { members: (data ?? []) as HouseholdMember[], error: null };
}

export async function isUserInHousehold(
  userId: string,
  householdId: string,
): Promise<boolean> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("household_members")
    .select("id")
    .eq("user_id", userId)
    .eq("household_id", householdId)
    .maybeSingle();

  return Boolean(data);
}

export async function addHouseholdMemberByUserId(
  householdId: string,
  userId: string,
  role: HouseholdRole = "member",
): Promise<{ error: string | null }> {
  const supabase = createServerClient();
  const { error } = await supabase.from("household_members").upsert(
    {
      household_id: householdId,
      user_id: userId,
      role,
    },
    { onConflict: "household_id,user_id" },
  );

  return { error: error?.message ?? null };
}

export async function removeHouseholdMember(
  householdId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const supabase = createServerClient();

  const { data: member } = await supabase
    .from("household_members")
    .select("role")
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .maybeSingle();

  if (member?.role === "owner") {
    return { error: "Cannot remove the household owner" };
  }

  const { error } = await supabase
    .from("household_members")
    .delete()
    .eq("household_id", householdId)
    .eq("user_id", userId);

  return { error: error?.message ?? null };
}

export async function updateHouseholdName(
  householdId: string,
  name: string,
): Promise<{ error: string | null }> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("households")
    .update({ name: name.trim() || "My household" })
    .eq("id", householdId);

  return { error: error?.message ?? null };
}

export async function listAllHouseholdOwnerUserIds(): Promise<string[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("role", "owner");

  if (error || !data) return [];
  return [...new Set(data.map((row) => row.user_id))];
}
