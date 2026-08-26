import { createServerClient } from "./supabase";

export type ActivityRow = {
  id: string;
  household_id: string;
  user_id: string | null;
  action: string;
  detail: string | null;
  created_at: string;
};

export async function recordHouseholdActivity(input: {
  householdId: string;
  userId?: string | null;
  action: string;
  detail?: string | null;
}): Promise<void> {
  const supabase = createServerClient();
  await supabase.from("household_activity").insert({
    household_id: input.householdId,
    user_id: input.userId ?? null,
    action: input.action,
    detail: input.detail ?? null,
  });
}

export async function listHouseholdActivity(
  householdId: string,
  limit = 40,
): Promise<ActivityRow[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("household_activity")
    .select("id, household_id, user_id, action, detail, created_at")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ActivityRow[];
}
