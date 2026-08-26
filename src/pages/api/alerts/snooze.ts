import type { APIRoute } from "astro";
import { applySnoozeToken } from "../../../lib/alertSnoozeTokens";

export const GET: APIRoute = async ({ url, redirect }) => {
  const token = url.searchParams.get("token")?.trim();
  if (!token) {
    return new Response("Missing token", { status: 400 });
  }

  const result = await applySnoozeToken(token);
  const params = new URLSearchParams({
    alert_saved: "1",
    snooze: result.ok ? "1" : "0",
    snooze_msg: result.message,
  });
  return redirect(`/dashboard/alerts?${params.toString()}`);
};
