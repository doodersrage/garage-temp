import type { APIRoute } from "astro";
import { applySnoozeToken } from "../../../lib/alertSnoozeTokens";

async function handleSnooze(url: URL): Promise<Response> {
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
  return Response.redirect(
    new URL(`/dashboard/alerts?${params.toString()}`, url.origin),
    302,
  );
}

/** Prefer POST so link prefetchers cannot snooze. */
export const POST: APIRoute = async ({ url }) => handleSnooze(url);

/** GET shows a confirm page (no side effects until POST). */
export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return new Response("Missing token", { status: 400 });
  }

  const action = `/api/alerts/snooze?token=${encodeURIComponent(token)}`;
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Snooze alerts</title></head>
<body style="font-family:system-ui,sans-serif;max-width:28rem;margin:3rem auto;padding:0 1rem">
<h1>Snooze alerts?</h1>
<p>Confirm snoozing threshold noise. Freeze/flood critical paths may still notify. Prefetchers will not complete this action.</p>
<form method="post" action="${action}">
<button type="submit" style="font-size:1rem;padding:0.6rem 1rem">Yes, snooze</button>
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
