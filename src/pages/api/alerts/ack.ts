import type { APIRoute } from "astro";
import { applyAckToken } from "../../../lib/alertAckTokens";

export const GET: APIRoute = async ({ url, redirect }) => {
  const userId = url.searchParams.get("uid")?.trim();
  const expRaw = url.searchParams.get("exp");
  const sig = url.searchParams.get("sig")?.trim() ?? "";
  const expMs = expRaw ? Number(expRaw) : NaN;

  if (!userId || !Number.isFinite(expMs)) {
    return redirect("/dashboard/alerts?ack_error=1");
  }

  const result = await applyAckToken(userId, expMs, sig);
  const params = new URLSearchParams({
    ack_ok: result.ok ? "1" : "0",
    ack_msg: result.message,
  });
  if (!result.ok) params.set("ack_error", "1");
  return redirect(`/dashboard/alerts?${params.toString()}`);
};
