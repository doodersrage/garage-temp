import type { User } from "@supabase/supabase-js";
import { createServerClient } from "./supabase";
import type { TempFeedConfig, TempProbeConfig } from "./tempFeedConfig";
import {
  getDefaultTempFeeds,
  getDefaultTempProbes,
  getLegacyTempProbes,
  sanitizeTempFeeds,
  sanitizeTempProbes,
} from "./tempFeedConfig";

type TempConfigRow = {
  feeds: TempFeedConfig[];
  probes: TempProbeConfig[];
};

export async function fetchUserTempConfig(userId: string): Promise<{
  feeds: TempFeedConfig[];
  probes: TempProbeConfig[];
  hasCustomConfig: boolean;
  error: string | null;
}> {
  const supabase = createServerClient();

  const { data: feedRows, error: feedsError } = await supabase
    .from("user_temp_feeds")
    .select("feed_id, name, url, enabled, sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (feedsError) {
    return {
      feeds: getDefaultTempFeeds(),
      probes: getDefaultTempProbes(),
      hasCustomConfig: false,
      error: feedsError.message,
    };
  }

  if (!feedRows || feedRows.length === 0) {
    return {
      feeds: getDefaultTempFeeds(),
      probes: getDefaultTempProbes(),
      hasCustomConfig: false,
      error: null,
    };
  }

  const feeds: TempFeedConfig[] = feedRows.map((row) => ({
    id: row.feed_id,
    name: row.name,
    url: row.url,
    enabled: row.enabled,
  }));

  const { data: probeRows, error: probesError } = await supabase
    .from("user_temp_probes")
    .select("probe_id, feed_id, probe_key, label, visible, sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (probesError) {
    return {
      feeds,
      probes: getDefaultTempProbes().filter((probe) =>
        feeds.some((feed) => feed.id === probe.feedId),
      ),
      hasCustomConfig: true,
      error: probesError.message,
    };
  }

  const probes: TempProbeConfig[] = (probeRows ?? []).map((row) => ({
    id: row.probe_id,
    feedId: row.feed_id,
    key: row.probe_key,
    label: row.label,
    visible: row.visible,
  }));

  return {
    feeds,
    probes:
      probes.length > 0
        ? sanitizeTempProbes(probes, feeds)
        : getDefaultTempProbes().filter((probe) =>
            feeds.some((feed) => feed.id === probe.feedId),
          ),
    hasCustomConfig: true,
    error: null,
  };
}

export async function saveUserTempConfig(
  userId: string,
  feeds: TempFeedConfig[],
  probes: TempProbeConfig[],
): Promise<{ error: Error | null }> {
  const supabase = createServerClient();
  const sanitizedFeeds = sanitizeTempFeeds(feeds);
  const sanitizedProbes = sanitizeTempProbes(probes, sanitizedFeeds);

  const { error: deleteFeedsError } = await supabase
    .from("user_temp_feeds")
    .delete()
    .eq("user_id", userId);

  if (deleteFeedsError) {
    return { error: new Error(deleteFeedsError.message) };
  }

  const { error: deleteProbesError } = await supabase
    .from("user_temp_probes")
    .delete()
    .eq("user_id", userId);

  if (deleteProbesError) {
    return { error: new Error(deleteProbesError.message) };
  }

  const feedRows = sanitizedFeeds.map((feed, index) => ({
    user_id: userId,
    feed_id: feed.id,
    name: feed.name,
    url: feed.url,
    enabled: feed.enabled,
    sort_order: index,
  }));

  const probeRows = sanitizedProbes.map((probe, index) => ({
    user_id: userId,
    probe_id: probe.id,
    feed_id: probe.feedId,
    probe_key: probe.key,
    label: probe.label,
    visible: probe.visible,
    sort_order: index,
  }));

  if (feedRows.length > 0) {
    const { error: insertFeedsError } = await supabase
      .from("user_temp_feeds")
      .insert(feedRows);

    if (insertFeedsError) {
      return { error: new Error(insertFeedsError.message) };
    }
  }

  if (probeRows.length > 0) {
    const { error: insertProbesError } = await supabase
      .from("user_temp_probes")
      .insert(probeRows);

    if (insertProbesError) {
      return { error: new Error(insertProbesError.message) };
    }
  }

  return { error: null };
}

async function getCurrentTempConfig(userId: string): Promise<TempConfigRow> {
  const stored = await fetchUserTempConfig(userId);

  if (stored.hasCustomConfig) {
    return {
      feeds: stored.feeds,
      probes: stored.probes,
    };
  }

  return {
    feeds: getDefaultTempFeeds(),
    probes: getDefaultTempProbes(),
  };
}

export async function saveUserTempFeeds(
  userId: string,
  feeds: TempFeedConfig[],
): Promise<{ error: Error | null }> {
  const current = await getCurrentTempConfig(userId);
  const sanitizedFeeds = sanitizeTempFeeds(feeds.length > 0 ? feeds : getDefaultTempFeeds());
  const sanitizedProbes = sanitizeTempProbes(
    current.probes.filter((probe) =>
      sanitizedFeeds.some((feed) => feed.id === probe.feedId),
    ),
    sanitizedFeeds,
  );

  return saveUserTempConfig(userId, sanitizedFeeds, sanitizedProbes);
}

export async function saveUserTempProbes(
  userId: string,
  probes: TempProbeConfig[],
): Promise<{ error: Error | null }> {
  const current = await getCurrentTempConfig(userId);
  const sanitizedProbes = sanitizeTempProbes(probes, current.feeds);

  return saveUserTempConfig(userId, current.feeds, sanitizedProbes);
}

export async function deleteUserTempFeed(
  userId: string,
  feedId: string,
): Promise<{ error: Error | null }> {
  const current = await getCurrentTempConfig(userId);
  const feeds = current.feeds.filter((feed) => feed.id !== feedId);
  const probes = current.probes.filter((probe) => probe.feedId !== feedId);

  if (feeds.length === 0) {
    return saveUserTempConfig(userId, getDefaultTempFeeds(), getDefaultTempProbes());
  }

  return saveUserTempConfig(userId, feeds, probes);
}

export async function deleteUserTempProbe(
  userId: string,
  probeId: string,
): Promise<{ error: Error | null }> {
  const current = await getCurrentTempConfig(userId);
  const probes = current.probes.filter((probe) => probe.id !== probeId);

  if (probes.length === 0) {
    const fallbackProbes = getDefaultTempProbes().filter((probe) =>
      current.feeds.some((feed) => feed.id === probe.feedId),
    );

    return saveUserTempConfig(
      userId,
      current.feeds,
      fallbackProbes.length > 0 ? fallbackProbes : probes,
    );
  }

  return saveUserTempConfig(userId, current.feeds, probes);
}

export async function migrateLegacyTempConfigFromMetadata(
  user: User,
): Promise<TempConfigRow> {
  const metadata = user.user_metadata ?? {};
  const tempFeeds = metadata.temp_feeds
    ? sanitizeTempFeeds(metadata.temp_feeds)
    : getDefaultTempFeeds();
  const tempProbes = metadata.temp_probes
    ? sanitizeTempProbes(metadata.temp_probes, tempFeeds)
    : getLegacyTempProbes(metadata);

  await saveUserTempConfig(user.id, tempFeeds, tempProbes);

  return { feeds: tempFeeds, probes: tempProbes };
}

export async function getUserTempConfig(user: User): Promise<{
  feeds: TempFeedConfig[];
  probes: TempProbeConfig[];
  error: string | null;
}> {
  const stored = await fetchUserTempConfig(user.id);

  if (stored.error) {
    return {
      feeds: stored.feeds,
      probes: stored.probes,
      error: stored.error,
    };
  }

  if (stored.hasCustomConfig) {
    return {
      feeds: stored.feeds,
      probes: stored.probes,
      error: null,
    };
  }

  const metadata = user.user_metadata ?? {};
  if (metadata.temp_feeds || metadata.temp_probes || metadata.show_probe_0 !== undefined) {
    const migrated = await migrateLegacyTempConfigFromMetadata(user);
    return {
      feeds: migrated.feeds,
      probes: migrated.probes,
      error: null,
    };
  }

  return {
    feeds: getDefaultTempFeeds(),
    probes: getDefaultTempProbes(),
    error: null,
  };
}
