/** @deprecated Prefer POST /api/user/pull-setup */
import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import type { TempProbeConfig } from "../../../lib/tempFeedConfig";
import { parseTempProbesFromFormData, sanitizeTempProbes } from "../../../lib/tempFeedConfig";
import { getUserTempConfig, saveUserTempProbes } from "../../../lib/userTempConfig";

import {
  redirectUnlessEditor,
  requireHouseholdEditor,
} from "../../../lib/householdAuth";
import { formRedirectPath } from "../../../lib/siteUrl";

function parseJsonProbes(body: unknown, feedIds: Set<string>): TempProbeConfig[] | null {
  if (!body || typeof body !== "object") return null;
  const payload = body as { probes?: unknown };
  if (!Array.isArray(payload.probes)) return null;

  const probes: TempProbeConfig[] = [];
  for (const [index, item] of payload.probes.entries()) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const key = typeof row.key === "string" ? row.key.trim() : "";
    const feedId = typeof row.feedId === "string" ? row.feedId.trim() : "";
    if (!key || !feedId || !feedIds.has(feedId)) continue;
    probes.push({
      id:
        typeof row.id === "string" && row.id.trim()
          ? row.id.trim()
          : `${feedId}-${key}-${index}`,
      feedId,
      key,
      label: typeof row.label === "string" && row.label.trim() ? row.label.trim() : `Probe ${key}`,
      visible: row.visible !== false,
    });
  }

  return probes.length > 0 ? probes : null;
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    if (request.headers.get("content-type")?.includes("application/json")) {
      return new Response(JSON.stringify({ ok: false, error: "Sign in required." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return redirect("/signin");
  }

  const contentType = request.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  const tempConfig = await getUserTempConfig(user);
  const feedIds = new Set(tempConfig.feeds.map((feed) => feed.id));

  const editor = await requireHouseholdEditor(user.id);

  let tempProbes: TempProbeConfig[];
  let redirectTo = "/dashboard/temperature?tab=pull";

  if (isJson) {
    if (!editor.ok) {
      return new Response(JSON.stringify({ ok: false, error: "View-only access." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    const body = (await request.json()) as { redirect?: string; probes?: unknown };
    redirectTo = typeof body.redirect === "string" ? body.redirect : redirectTo;
    const parsed = parseJsonProbes(body, feedIds);
    if (!parsed) {
      return new Response(JSON.stringify({ ok: false, error: "No valid probes provided." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    tempProbes = sanitizeTempProbes(parsed, tempConfig.feeds);
  } else {
    const formData = await request.formData();
    redirectTo = formRedirectPath(formData, redirectTo);
    const blocked = redirectUnlessEditor(editor, redirectTo, redirect);
    if (blocked) return blocked;
    tempProbes = parseTempProbesFromFormData(formData, tempConfig.feeds);
  }

  const { error } = await saveUserTempProbes(user.id, tempProbes);

  if (error) {
    if (isJson) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    return redirect(`${redirectTo.split("?")[0]}?probes_error=1&tab=pull`);
  }

  if (isJson) {
    return new Response(
      JSON.stringify({ ok: true, redirect: `${redirectTo.split("?")[0]}?pull_saved=1&tab=pull` }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  return redirect(`${redirectTo.split("?")[0]}?pull_saved=1&tab=pull`);
};
