import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getUserEntitlements } from "../../../lib/entitlements";
import { clampIsoToHistoryWindow } from "../../../lib/retentionSchedule";
import { listAlertEventsInRange, buildAlertEventsCsv } from "../../../lib/alertEvents";

function parseDateParam(value: string | null, endOfDay = false): string | undefined {
  if (!value?.trim()) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }
  return parsed.toISOString();
}

export const GET: APIRoute = async ({ cookies, url }) => {
  const { session, user } = await getAuthFromCookies(cookies);
  if (!session || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const entitlements = await getUserEntitlements(user.id);
  if (!entitlements.canUseClaimsPack) {
    return new Response("Claims pack export requires Pro", { status: 403 });
  }

  const from = clampIsoToHistoryWindow(
    parseDateParam(url.searchParams.get("from")),
    entitlements.historyDays,
  );
  const to =
    parseDateParam(url.searchParams.get("to"), true) ?? new Date().toISOString();

  const events = await listAlertEventsInRange(user.id, from, to);
  const csv = buildAlertEventsCsv(events);
  const filename = `thermaltrace-alert-events-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
};
