import { createAdminClient } from "./supabase";

export type CheckoutEvent = {
  id: string;
  userId: string | null;
  plan: string;
  interval: string;
  source: string | null;
  createdAt: string;
};

export type CheckoutAnalytics = {
  totalCheckouts: number;
  last30Days: number;
  bySource: Array<{ source: string; count: number }>;
  byPlan: Array<{ plan: string; count: number }>;
  recent: CheckoutEvent[];
};

export function parseCheckoutDetail(detail: string | null | undefined): {
  plan: string;
  interval: string;
  source: string | null;
} {
  if (!detail?.trim()) {
    return { plan: "unknown", interval: "unknown", source: null };
  }

  const viaIndex = detail.indexOf(" via ");
  const head = viaIndex >= 0 ? detail.slice(0, viaIndex) : detail;
  const source = viaIndex >= 0 ? detail.slice(viaIndex + 5).trim() || null : null;
  const [plan = "unknown", interval = "unknown"] = head.split("/");

  return { plan, interval, source };
}

function countBy<T extends string>(
  items: T[],
  label = "unknown",
): Array<{ key: string; count: number }> {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = item || label;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export async function fetchCheckoutAnalyticsAdmin(
  days = 30,
  recentLimit = 25,
): Promise<CheckoutAnalytics> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows } = await admin
    .from("household_activity")
    .select("id, user_id, detail, created_at")
    .eq("action", "checkout_started")
    .order("created_at", { ascending: false })
    .limit(500);

  const all = rows ?? [];
  const recentRows = all.filter((row) => row.created_at >= since);

  const parsed = recentRows.map((row) => {
    const parts = parseCheckoutDetail(row.detail);
    return {
      id: row.id,
      userId: row.user_id,
      plan: parts.plan,
      interval: parts.interval,
      source: parts.source,
      createdAt: row.created_at,
    };
  });

  return {
    totalCheckouts: all.length,
    last30Days: recentRows.length,
    bySource: countBy(parsed.map((row) => row.source ?? "direct")).map(({ key, count }) => ({
      source: key,
      count,
    })),
    byPlan: countBy(parsed.map((row) => row.plan)).map(({ key, count }) => ({
      plan: key,
      count,
    })),
    recent: parsed.slice(0, recentLimit),
  };
}
