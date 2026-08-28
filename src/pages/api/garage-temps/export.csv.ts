import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { canDownloadHistoryCsv } from "../../../lib/adminAccess";
import {
  buildGarageTempsCsv,
  fetchAllGarageTempReadings,
  type HistoryFilters,
} from "../../../lib/garageTempsHistory";

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

  const allowed = await canDownloadHistoryCsv(user.id);

  if (!allowed) {
    return new Response("CSV export requires an active subscription or admin access", {
      status: 403,
    });
  }

  const filters: HistoryFilters = {
    feedName: url.searchParams.get("feed")?.trim() || undefined,
    probeKey: url.searchParams.get("probe")?.trim() || undefined,
    from: parseDateParam(url.searchParams.get("from")),
    to: parseDateParam(url.searchParams.get("to"), true),
  };

  const { readings, error } = await fetchAllGarageTempReadings(user.id, filters);

  if (error) {
    return new Response(error, { status: 500 });
  }

  const csv = buildGarageTempsCsv(readings);
  const filename = `thermaltrace-readings-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
};
