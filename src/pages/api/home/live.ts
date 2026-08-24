import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { getUserPreferences } from "../../../lib/userPreferences";

export const GET: APIRoute = async ({ cookies }) => {
  const { session, user } = await getAuthFromCookies(cookies);

  if (!session || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const preferences = await getUserPreferences(user);

  const groups = preferences.tempFeeds
    .filter((feed) => feed.enabled)
    .map((feed) => {
      const probes = preferences.tempProbes.filter(
        (probe) => probe.feedId === feed.id && probe.visible,
      );

      return {
        feedId: feed.id,
        feedName: feed.name,
        url: feed.url,
        probes: probes.map((probe) => ({
          key: probe.key,
          label: probe.label,
          visible: probe.visible,
        })),
      };
    });

  return new Response(JSON.stringify({ feeds: groups }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
