import { createAdminClient, createServerClient } from "./supabase";

export async function deleteUserAccount(
  userId: string,
): Promise<{ error: string | null }> {
  const supabase = createServerClient();

  // Remove owned households where user is sole owner (cascade deletes devices)
  const { data: owned } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .eq("role", "owner");

  for (const row of owned ?? []) {
    const { count } = await supabase
      .from("household_members")
      .select("id", { count: "exact", head: true })
      .eq("household_id", row.household_id);

    if ((count ?? 0) <= 1) {
      await supabase.from("households").delete().eq("id", row.household_id);
    } else {
      await supabase
        .from("household_members")
        .delete()
        .eq("household_id", row.household_id)
        .eq("user_id", userId);
    }
  }

  await supabase.from("alert_settings").delete().eq("user_id", userId);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  return { error: error?.message ?? null };
}

export function resolveDataRetentionDays(
  userRetention: number | null | undefined,
  tier: "free" | "member" | "pro" | "admin",
): number {
  if (userRetention != null && userRetention >= 30) {
    return Math.min(userRetention, tier === "pro" || tier === "admin" ? 730 : 365);
  }
  if (tier === "pro" || tier === "admin") return 365;
  if (tier === "member") return 180;
  return 90;
}
