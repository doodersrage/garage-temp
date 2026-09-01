import type { User } from "@supabase/supabase-js";
import { createAuthClient } from "./supabase";

export type DashboardOverviewMode = "simple" | "insights";

export function getDashboardOverviewMode(
  user: User | null | undefined,
): DashboardOverviewMode {
  const raw = user?.user_metadata?.dashboard_overview_mode;
  return raw === "insights" ? "insights" : "simple";
}

export async function updateDashboardOverviewMode(
  accessToken: string,
  refreshToken: string,
  mode: DashboardOverviewMode,
): Promise<{ user: User | null; error: Error | null }> {
  const client = createAuthClient();
  const { data: sessionData, error: sessionError } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError || !sessionData.session) {
    return { user: null, error: sessionError ?? new Error("Invalid session") };
  }

  const { data, error } = await client.auth.updateUser({
    data: { dashboard_overview_mode: mode },
  });

  if (error) {
    return { user: null, error };
  }

  return { user: data.user, error: null };
}
