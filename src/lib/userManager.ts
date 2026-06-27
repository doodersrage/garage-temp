import { createServerClient } from "./supabase";

export type ManagedUser = {
  user_id: string;
  email: string;
  created_at: string;
  groups: string[];
  is_admin: boolean;
};

export type PaginatedManagedUsers = {
  users: ManagedUser[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  error: string | null;
};

export const MANAGED_USERS_PAGE_SIZE = 20;

export function formatUserTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function formatUserGroups(groups: string[]): string {
  if (groups.length === 0) {
    return "None";
  }

  return groups.join(", ");
}

export async function fetchManagedUsers(
  callerId: string,
  page = 1,
  pageSize = MANAGED_USERS_PAGE_SIZE,
): Promise<PaginatedManagedUsers> {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const supabase = createServerClient();

  const [{ data: users, error: listError }, { data: totalCount, error: countError }] =
    await Promise.all([
      supabase.rpc("list_managed_users", {
        caller_id: callerId,
        page_num: safePage,
        page_size: pageSize,
      }),
      supabase.rpc("count_managed_users", {
        caller_id: callerId,
      }),
    ]);

  if (listError || countError) {
    return {
      users: [],
      page: safePage,
      pageSize,
      totalCount: 0,
      totalPages: 0,
      error: listError?.message ?? countError?.message ?? "Unable to load users",
    };
  }

  const total = Number(totalCount ?? 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  return {
    users: (users ?? []) as ManagedUser[],
    page: safePage,
    pageSize,
    totalCount: total,
    totalPages,
    error: null,
  };
}

export async function setUserAdminMembership(
  callerId: string,
  targetUserId: string,
  makeAdmin: boolean,
): Promise<{ error: string | null }> {
  const supabase = createServerClient();
  const { error } = await supabase.rpc("set_user_admin_membership", {
    caller_id: callerId,
    target_user_id: targetUserId,
    make_admin: makeAdmin,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
