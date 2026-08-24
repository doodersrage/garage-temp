import { createServerClient } from "./supabase";
import { fetchTemps } from "./FetchTemps";
import { fetchUserTempConfig } from "./userTempConfig";
import { maybeSendThresholdAlerts } from "./alertNotifications";

export type FeedHealthStatus = {
  feedId: string;
  feedName: string;
  url: string;
  ok: boolean;
  message: string;
  probeCount: number;
  checkedAt: string;
};

export async function checkFeedHealth(
  userId: string,
): Promise<{ statuses: FeedHealthStatus[]; error: string | null }> {
  const config = await fetchUserTempConfig(userId);

  if (config.error) {
    return { statuses: [], error: config.error };
  }

  const enabledFeeds = config.feeds.filter((feed) => feed.enabled);
  const results = await fetchTemps({
    feeds: enabledFeeds,
    probes: config.probes,
    saveToDatabase: false,
  });

  const checkedAt = new Date().toISOString();
  const statuses: FeedHealthStatus[] = enabledFeeds.map((feed) => {
    const result = results.find((item) => item.id === feed.id);

    if (!result || result.error) {
      return {
        feedId: feed.id,
        feedName: feed.name,
        url: feed.url,
        ok: false,
        message: result?.error ?? "Feed unreachable",
        probeCount: 0,
        checkedAt,
      };
    }

    return {
      feedId: feed.id,
      feedName: feed.name,
      url: feed.url,
      ok: true,
      message: `${Object.keys(result.probes).length} probe(s) responding`,
      probeCount: Object.keys(result.probes).length,
      checkedAt,
    };
  });

  return { statuses, error: null };
}

export async function collectHistoryForAllUsers(): Promise<{
  usersProcessed: number;
  errors: string[];
}> {
  const supabase = createServerClient();
  const errors: string[] = [];
  let usersProcessed = 0;

  const { data: feedRows, error } = await supabase
    .from("user_temp_feeds")
    .select("user_id")
    .order("user_id");

  if (error) {
    return { usersProcessed: 0, errors: [error.message] };
  }

  const userIds = [...new Set((feedRows ?? []).map((row) => row.user_id))];

  for (const userId of userIds) {
    try {
      const config = await fetchUserTempConfig(userId);
      if (config.error) {
        errors.push(`${userId}: ${config.error}`);
        continue;
      }

      await fetchTemps({
        feeds: config.feeds,
        probes: config.probes.filter((probe) => probe.visible),
        saveToDatabase: true,
        userId,
      });

      usersProcessed += 1;
    } catch (e) {
      errors.push(
        `${userId}: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  }

  return { usersProcessed, errors };
}
