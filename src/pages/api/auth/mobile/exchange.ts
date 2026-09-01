import type { APIRoute } from "astro";
import { verifyMobileExchangeToken } from "../../../../lib/mobileAuthExchange";

export const POST: APIRoute = async ({ request }) => {
  let body: { exchange_token?: string };
  try {
    body = (await request.json()) as { exchange_token?: string };
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const exchangeToken = body.exchange_token?.trim();
  if (!exchangeToken) {
    return new Response(JSON.stringify({ error: "Missing exchange_token" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tokens = await verifyMobileExchangeToken(exchangeToken);
  if (!tokens) {
    return new Response(JSON.stringify({ error: "Invalid or expired exchange token" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, ...tokens }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
};
