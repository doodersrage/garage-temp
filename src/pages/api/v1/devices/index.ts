import type { APIRoute } from "astro";
import { resolveApiKey } from "../../../../lib/apiKeys";
import {
  createPushDevice,
  listHouseholdDevices,
} from "../../../../lib/devices";

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const GET: APIRoute = async ({ request }) => {
  const auth = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!auth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const resolved = await resolveApiKey(auth);
  if (!resolved) {
    return new Response(JSON.stringify({ error: "Invalid API key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { devices, error } = await listHouseholdDevices(resolved.householdId);
  if (error) {
    return new Response(JSON.stringify({ error }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      devices: devices.map((d) => ({
        id: d.id,
        name: d.name,
        source: d.source,
        space: d.space,
        last_seen_at: d.last_seen_at,
      })),
    }),
    { headers: { "Content-Type": "application/json" } },
  );
};

export const POST: APIRoute = async ({ request }) => {
  const auth = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!auth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const resolved = await resolveApiKey(auth);
  if (!resolved) {
    return new Response(JSON.stringify({ error: "Invalid API key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { name?: string; space?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const name = body.name?.trim() || "API device";
  const rawKey = randomKey();
  const hash = await sha256Hex(rawKey);
  const prefix = rawKey.slice(0, 8);
  const result = await createPushDevice(resolved.householdId, name, hash, prefix);

  if (result.error || !result.device) {
    return new Response(JSON.stringify({ error: result.error ?? "Failed" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      device: { id: result.device.id, name: result.device.name },
      ingest_key: rawKey,
    }),
    { status: 201, headers: { "Content-Type": "application/json" } },
  );
};
