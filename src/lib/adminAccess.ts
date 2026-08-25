import { createServerClient } from "./supabase";

export const ADMIN_GROUP_NAME = "admin";
export const USER_GROUP_NAME = "user";
export const MEMBER_GROUP_NAME = "member";

export async function canDownloadHistoryCsv(userId: string): Promise<boolean> {
  const { getUserEntitlements } = await import("./entitlements");
  const entitlements = await getUserEntitlements(userId);
  return entitlements.canDownloadCsv;
}

export async function isUserInGroup(
  userId: string,
  groupName: string,
): Promise<boolean> {
  const supabase = createServerClient();

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id")
    .eq("name", groupName)
    .maybeSingle();

  if (groupError || !group) {
    return false;
  }

  const { data: membership, error: memberError } = await supabase
    .from("group_members")
    .select("id")
    .eq("user_id", userId)
    .eq("group_id", group.id)
    .maybeSingle();

  if (memberError || !membership) {
    return false;
  }

  return true;
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  return isUserInGroup(userId, ADMIN_GROUP_NAME);
}
