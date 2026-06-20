import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import {
  buildGarageTempsCsv,
  fetchAllGarageTempReadings,
} from "../../../lib/garageTempsHistory";

export const GET: APIRoute = async ({ cookies }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { readings, error } = await fetchAllGarageTempReadings();

  if (error) {
    return new Response(error, { status: 500 });
  }

  const csv = buildGarageTempsCsv(readings);
  const filename = `garage-temp-readings-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
};
