import type { APIRoute } from "astro";
import { resolveApiKey } from "../../../lib/apiKeys";
import { createServerClient } from "../../../lib/supabase";
import type { TempFeedConfig, TempProbeConfig } from "../../../lib/tempFeedConfig";
import { sanitizeTempFeeds, sanitizeTempProbes } from "../../../lib/tempFeedConfig";
import { saveUserPullSetup } from "../../../lib/userTempConfig";

function parseFeeds(body: unknown): TempFeedConfig[] | null {
  if (!body || typeof body !== "object") return null;
  const feeds = (body as { feeds?: unknown }).feeds;
  if (!Array.isArray(feeds)) return null;
  const parsed: TempFeedConfig[] = [];
  for (const [index, item] of feeds.entries()) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const url = typeof row.url === "string" ? row.url.trim() : "";
    if (!url) continue;
    parsed.push({
      id:
        typeof row.id === "string" && row.id.trim()
          ? row.id.trim()
          : `feed-${index}`,
      name:
        typeof row.name === "string" && row.name.trim()
          ? row.name.trim()
          : `Feed ${index + 1}`,
      url,
      enabled: row.enabled !== false,
      jsonRoot: typeof row.jsonRoot === "string" ? row.jsonRoot : "temp",
    });
  }
  return parsed.length > 0 ? parsed : null;
}

function parseProbes(body: unknown, feedIds: Set<string>): TempProbeConfig[] {
  if (!body || typeof body !== "object") return [];
  const probes = (body as { probes?: unknown }).probes;
  if (!Array.isArray(probes)) return [];

  const parsed: TempProbeConfig[] = [];
  for (const [index, item] of probes.entries()) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const key = typeof row.key === "string" ? row.key.trim() : "";
    const feedId = typeof row.feedId === "string" ? row.feedId.trim() : "";
    if (!key || !feedId || !feedIds.has(feedId)) continue;
    parsed.push({
      id:
        typeof row.id === "string" && row.id.trim()
          ? row.id.trim()
          : `${feedId}-${key}-${index}`,
      feedId,
      key,
      label:
        typeof row.label === "string" && row.label.trim()
          ? row.label.trim()
          : `Probe ${key}`,
      visible: row.visible !== false,
    });
  }
  return parsed;
}

async function householdOwnerUserId(householdId: string): Promise<string | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdId)
    .eq("role", "owner")
    .maybeSingle();
  return data?.user_id ?? null;
}

export const POST: APIRoute = async ({ request }) => {
  const auth = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!auth) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const resolved = await resolveApiKey(auth);
  if (!resolved) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid API key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const feeds = parseFeeds(body);
  if (!feeds) {
    return new Response(JSON.stringify({ ok: false, error: "No valid feeds provided." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const feedIds = new Set(feeds.map((feed) => feed.id));
  const probes = parseProbes(body, feedIds);
  const sanitizedFeeds = sanitizeTempFeeds(feeds);
  const sanitizedProbes = sanitizeTempProbes(probes, sanitizedFeeds);
  const ownerUserId = await householdOwnerUserId(resolved.householdId);
  if (!ownerUserId) {
    return new Response(JSON.stringify({ ok: false, error: "Household owner not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { error, discoveredProbes } = await saveUserPullSetup(
    ownerUserId,
    sanitizedFeeds,
    sanitizedProbes,
  );

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ ok: true, discoveredProbes: discoveredProbes ?? 0 }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};
