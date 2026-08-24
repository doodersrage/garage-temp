import { createServerClient } from "./supabase";
import type { TempFeedConfig, TempFeedResult, TempProbeConfig, TempReading } from "./tempFeedConfig";
import {
  getDefaultTempFeeds,
  getDefaultTempProbes,
  parseTempFeedPayload,
} from "./tempFeedConfig";
import { maybeSendThresholdAlerts } from "./alertNotifications";

export type FetchTempsOptions = {
  feeds?: TempFeedConfig[];
  probes?: TempProbeConfig[];
  saveToDatabase?: boolean;
  userId?: string | null;
  userEmail?: string | null;
  userMetadata?: Record<string, unknown>;
  sendAlerts?: boolean;
};

async function saveProbeReadings(
  feedResults: TempFeedResult[],
  probes: TempProbeConfig[],
  userId: string,
): Promise<void> {
  const supabase = createServerClient();
  const timestamp = new Date();
  const feedsById = new Map(feedResults.map((feed) => [feed.id, feed]));

  const rows = probes.flatMap((probe) => {
    const feed = feedsById.get(probe.feedId);
    if (!feed || feed.error) {
      return [];
    }

    const reading = feed.probes[probe.key];
    if (!reading) {
      return [];
    }

    return [
      {
        user_id: userId,
        feed_name: feed.name,
        probe_label: probe.label,
        probe_key: probe.key,
        tempc: reading.c,
        tempf: reading.f,
        humidity: reading.h,
        timestamp,
      },
    ];
  });

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from("garage_temps").insert(rows);

  if (error) {
    console.error("Failed to save garage temperature readings:", error.message);
  }
}

export async function fetchTempFeed(feed: TempFeedConfig): Promise<TempFeedResult> {
  try {
    const response = await fetch(feed.url);

    if (!response.ok) {
      throw new Error(`Temperature feed request failed (${response.status})`);
    }

    const payload = await response.json();
    const probes = parseTempFeedPayload(payload);

    return {
      id: feed.id,
      name: feed.name,
      url: feed.url,
      probes,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown feed error";
    console.error(`Failed to fetch temperature feed ${feed.id}:`, message);

    return {
      id: feed.id,
      name: feed.name,
      url: feed.url,
      probes: {},
      error: message,
    };
  }
}

export async function fetchTemps(
  options: FetchTempsOptions = {},
): Promise<TempFeedResult[]> {
  const feeds = (options.feeds ?? getDefaultTempFeeds()).filter((feed) => feed.enabled);
  const probes = options.probes ?? getDefaultTempProbes();
  const results = await Promise.all(feeds.map((feed) => fetchTempFeed(feed)));

  if (options.saveToDatabase !== false && options.userId) {
    const visibleProbes = probes.filter((probe) => probe.visible);
    await saveProbeReadings(results, visibleProbes, options.userId);

    if (options.sendAlerts !== false) {
      await maybeSendThresholdAlerts(
        options.userId,
        options.userEmail,
        options.userMetadata,
        feeds,
        visibleProbes,
      );
    }
  }

  return results;
}

export async function fetchLegacyTempPayload(
  options: FetchTempsOptions = {},
): Promise<{ temp: Record<string, TempReading> }> {
  const feeds = options.feeds ?? getDefaultTempFeeds();
  const primaryFeed = feeds.find((feed) => feed.enabled) ?? feeds[0];
  const [result] = await fetchTemps({
    ...options,
    feeds: primaryFeed ? [primaryFeed] : [],
  });

  return {
    temp: result?.probes ?? {},
  };
}
