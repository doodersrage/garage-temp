import type { APIRoute } from "astro";
import { unsubscribeStatusSubscription } from "../../../lib/statusSubscriptions";

export const prerender = false;

export const GET: APIRoute = async ({ url, redirect }) => {
  const token = url.searchParams.get("token")?.trim();
  if (!token) {
    return redirect("/system-status?status_error=invalid_token");
  }

  const result = await unsubscribeStatusSubscription(token);
  return redirect(
    `/system-status?${result.ok ? "unsubscribed=1" : "status_error=invalid_token"}`,
  );
};
