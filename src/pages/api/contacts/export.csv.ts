import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { isUserAdmin } from "../../../lib/adminAccess";
import {
  buildContactsCsv,
  fetchAllContactSubmissions,
} from "../../../lib/contactSubmissions";

export const GET: APIRoute = async ({ cookies }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = await isUserAdmin(user.id);

  if (!admin) {
    return new Response("Forbidden", { status: 403 });
  }

  const { submissions, error } = await fetchAllContactSubmissions();

  if (error) {
    return new Response(error, { status: 500 });
  }

  const csv = buildContactsCsv(submissions);
  const filename = `contact-submissions-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
};
