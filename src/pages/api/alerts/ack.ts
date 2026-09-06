import type { APIRoute } from "astro";
import { applyAckToken } from "../../../lib/alertAckTokens";

async function handleAck(url: URL): Promise<Response> {
  const userId = url.searchParams.get("uid")?.trim();
  const expRaw = url.searchParams.get("exp");
  const sig = url.searchParams.get("sig")?.trim() ?? "";
  const expMs = expRaw ? Number(expRaw) : NaN;

  if (!userId || !Number.isFinite(expMs)) {
    return Response.redirect(new URL("/dashboard/alerts?ack_error=1", url.origin), 302);
  }

  const result = await applyAckToken(userId, expMs, sig);
  const params = new URLSearchParams({
    ack_ok: result.ok ? "1" : "0",
    ack_msg: result.message,
  });
  if (!result.ok) params.set("ack_error", "1");
  return Response.redirect(
    new URL(`/dashboard/alerts?${params.toString()}`, url.origin),
    302,
  );
}

/** Prefer POST so email prefetchers / CSRF GETs cannot acknowledge. */
export const POST: APIRoute = async ({ url }) => handleAck(url);

/**
 * GET shows a confirm page for email links (no side effects until POST).
 */
export const GET: APIRoute = async ({ url }) => {
  const userId = url.searchParams.get("uid")?.trim() ?? "";
  const exp = url.searchParams.get("exp")?.trim() ?? "";
  const sig = url.searchParams.get("sig")?.trim() ?? "";
  if (!userId || !exp || !sig) {
    return Response.redirect(new URL("/dashboard/alerts?ack_error=1", url.origin), 302);
  }

  const action = `/api/alerts/ack?uid=${encodeURIComponent(userId)}&exp=${encodeURIComponent(exp)}&sig=${encodeURIComponent(sig)}`;
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Acknowledge alert</title></head>
<body style="font-family:system-ui,sans-serif;max-width:28rem;margin:3rem auto;padding:0 1rem">
<h1>Acknowledge alert?</h1>
<p>Confirm that you are handling this freeze or flood alert. Prefetchers will not complete this action.</p>
<form method="post" action="${action}">
<button type="submit" style="font-size:1rem;padding:0.6rem 1rem">Yes, mark as handled</button>
</form>
<p><a href="/dashboard/alerts">Cancel</a></p>
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
};
