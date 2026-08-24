import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { fetchTemps } from "../../../lib/FetchTemps";
import { getUserPreferences } from "../../../lib/userPreferences";
import { buildFeedDisplayGroups } from "../../../lib/tempFeedConfig";

export const GET: APIRoute = async ({ cookies, url }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const save = url.searchParams.get("save") !== "0";
  const preferences = await getUserPreferences(user);
  const visibleProbes = preferences.tempProbes.filter((probe) => probe.visible);

  const results = await fetchTemps({
    feeds: preferences.tempFeeds,
    probes: visibleProbes,
    saveToDatabase: save,
    userId: user.id,
    userEmail: user.email,
    userMetadata: user.user_metadata as Record<string, unknown>,
  });

  const groups = buildFeedDisplayGroups(
    preferences.tempFeeds,
    preferences.tempProbes,
    results,
  ).map((group) => ({
    feedId: group.feedId,
    feedName: group.feedName,
    enabled: group.enabled,
    error: group.error,
    probes: group.probes.map((probe) => ({
      key: probe.key,
      label: probe.label,
      data: probe.data
        ? { f: probe.data.f, c: probe.data.c, h: probe.data.h }
        : null,
    })),
  }));

  return new Response(
    JSON.stringify({
      updatedAt: new Date().toISOString(),
      groups,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
};
