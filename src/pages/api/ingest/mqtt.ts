import type { APIRoute } from "astro";

/**
 * MQTT-over-HTTP bridge: POST JSON shaped like an MQTT webhook relay.
 * Body: { "topic": "home/garage/temp", "payload": "{\"temp1\":42.5}" }
 * or:   { "topic": "...", "message": { "temp1": 42.5 } }
 *
 * Include header `X-Ingest-Key: <device-key>` to route to ingest.
 */
export const POST: APIRoute = async ({ request }) => {
  const deviceKey = request.headers.get("X-Ingest-Key")?.trim();
  if (!deviceKey) {
    return new Response(JSON.stringify({ error: "Missing X-Ingest-Key header" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let envelope: Record<string, unknown>;
  try {
    envelope = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: Record<string, unknown>;
  if (envelope.message && typeof envelope.message === "object") {
    payload = envelope.message as Record<string, unknown>;
  } else if (typeof envelope.payload === "string") {
    try {
      payload = JSON.parse(envelope.payload) as Record<string, unknown>;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid payload JSON string" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  } else if (envelope.payload && typeof envelope.payload === "object") {
    payload = envelope.payload as Record<string, unknown>;
  } else {
    return new Response(JSON.stringify({ error: "Missing payload or message" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const origin = new URL(request.url).origin;
  const ingestRes = await fetch(`${origin}/api/ingest/${encodeURIComponent(deviceKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await ingestRes.text();
  return new Response(text, {
    status: ingestRes.status,
    headers: { "Content-Type": "application/json" },
  });
};
