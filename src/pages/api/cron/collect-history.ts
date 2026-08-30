import type { APIRoute } from "astro";
import { collectHistoryForAllUsers } from "../../../lib/collectHistory";
import { checkCronRateLimit } from "../../../lib/cronLimits";

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const rate = checkCronRateLimit(clientAddress || "unknown");
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: rate.error }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...(rate.retryAfterSec
          ? { "Retry-After": String(rate.retryAfterSec) }
          : {}),
      },
    });
  }

  const secret = import.meta.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = await collectHistoryForAllUsers();

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const GET = POST;
