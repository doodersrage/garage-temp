import type { User } from "@supabase/supabase-js";
import { createServerClient, createAdminClient } from "./supabase";
import type { TempFeedConfig, TempProbeConfig } from "./tempFeedConfig";
import {
  getDefaultTempFeeds,
  getDefaultTempProbes,
  getLegacyTempProbes,
  normalizePullFeedUrl,
  sanitizeJsonRoot,
  sanitizeTempFeeds,
  sanitizeTempProbes,
} from "./tempFeedConfig";
import { discoverAndMergeFeedProbes } from "./feedDiscovery";

export { normalizePullFeedUrl };

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
    jsonRoot: "temp",
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

/**
 * Idempotently copy user_temp_feeds / user_temp_probes into household pull devices,
 * then clear the legacy tables for that user.
 */
export async function migrateLegacyTempTablesToDevices(
  userId: string,
  email?: string | null,
): Promise<{
  migratedFeeds: number;
  createdDevices: number;
  ensuredSensors: number;
  cleared: boolean;
  error: string | null;
}> {
  const stored = await fetchUserTempConfig(userId);
  if (stored.error) {
    return {
      migratedFeeds: 0,
      createdDevices: 0,
      ensuredSensors: 0,
      cleared: false,
      error: stored.error,
    };
  }
  if (!stored.hasCustomConfig) {
    return {
      migratedFeeds: 0,
      createdDevices: 0,
      ensuredSensors: 0,
      cleared: false,
      error: null,
    };
  }

  const feeds = sanitizeTempFeeds(stored.feeds);
  const probes = sanitizeTempProbes(stored.probes, feeds);

  const { getOrCreateHouseholdForUser } = await import("./households");
  const { listHouseholdDevices } = await import("./devices");
  const household = await getOrCreateHouseholdForUser(userId, email);
  if (!household.householdId) {
    return {
      migratedFeeds: feeds.length,
      createdDevices: 0,
      ensuredSensors: 0,
      cleared: false,
      error: household.error || "No household for user",
    };
  }

  const existing = await listHouseholdDevices(household.householdId);
  if (existing.error) {
    return {
      migratedFeeds: feeds.length,
      createdDevices: 0,
      ensuredSensors: 0,
      cleared: false,
      error: existing.error,
    };
  }

  const supabase = createServerClient();
  let createdDevices = 0;
  let ensuredSensors = 0;

  const pullByUrl = new Map(
    existing.devices
      .filter((d) => d.source === "pull_url" && d.pull_url)
      .map((d) => [normalizePullFeedUrl(d.pull_url!), d]),
  );

  for (const [index, feed] of feeds.entries()) {
    const urlKey = normalizePullFeedUrl(feed.url);
    let device = pullByUrl.get(urlKey) ?? null;

    if (!device) {
      const { data: inserted, error } = await supabase
        .from("devices")
        .insert({
          household_id: household.householdId,
          name: feed.name,
          source: "pull_url",
          pull_url: feed.url,
          enabled: feed.enabled,
          sort_order: index,
          meta: {
            pull_json_root: sanitizeJsonRoot(feed.jsonRoot),
          },
        })
        .select("id")
        .single();

      if (error || !inserted) {
        return {
          migratedFeeds: feeds.length,
          createdDevices,
          ensuredSensors,
          cleared: false,
          error: error?.message ?? "Failed to create pull device",
        };
      }

      device = {
        id: inserted.id,
        household_id: household.householdId,
        name: feed.name,
        source: "pull_url",
        pull_url: feed.url,
        enabled: feed.enabled,
        sort_order: index,
        meta: {},
        space: null,
        last_seen_at: null,
        ingest_key_prefix: null,
        sensors: [],
      } as (typeof existing.devices)[number];
      pullByUrl.set(urlKey, device);
      createdDevices += 1;
    } else {
      await supabase
        .from("devices")
        .update({
          name: feed.name,
          enabled: feed.enabled,
          sort_order: index,
          meta: {
            ...(device.meta && typeof device.meta === "object" && !Array.isArray(device.meta)
              ? (device.meta as Record<string, unknown>)
              : {}),
            pull_json_root: sanitizeJsonRoot(feed.jsonRoot),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", device.id);
    }

    const feedProbes = probes.filter((probe) => probe.feedId === feed.id);
    const existingKeys = new Set(
      (device.sensors ?? [])
        .filter((s) => s.kind === "temperature")
        .map((s) => s.key),
    );

    for (const [probeIndex, probe] of feedProbes.entries()) {
      if (existingKeys.has(probe.key)) continue;

      const rows = [
        {
          device_id: device.id,
          key: probe.key,
          label: probe.label,
          kind: "temperature" as const,
          unit: "F",
          visible: probe.visible,
          sort_order: probeIndex,
        },
        {
          device_id: device.id,
          key: probe.key,
          label: `${probe.label} humidity`,
          kind: "humidity" as const,
          unit: "%",
          visible: probe.visible,
          sort_order: probeIndex,
        },
      ];

      const { error: sensorError } = await supabase.from("device_sensors").insert(rows);
      if (sensorError) {
        // Conflict = already present; ignore unique violations
        if (!/duplicate|conflict/i.test(sensorError.message)) {
          return {
            migratedFeeds: feeds.length,
            createdDevices,
            ensuredSensors,
            cleared: false,
            error: sensorError.message,
          };
        }
      } else {
        ensuredSensors += 1;
        existingKeys.add(probe.key);
      }
    }
  }

  const { error: deleteProbesError } = await supabase
    .from("user_temp_probes")
    .delete()
    .eq("user_id", userId);
  if (deleteProbesError) {
    return {
      migratedFeeds: feeds.length,
      createdDevices,
      ensuredSensors,
      cleared: false,
      error: deleteProbesError.message,
    };
  }

  const { error: deleteFeedsError } = await supabase
    .from("user_temp_feeds")
    .delete()
    .eq("user_id", userId);
  if (deleteFeedsError) {
    return {
      migratedFeeds: feeds.length,
      createdDevices,
      ensuredSensors,
      cleared: false,
      error: deleteFeedsError.message,
    };
  }

  return {
    migratedFeeds: feeds.length,
    createdDevices,
    ensuredSensors,
    cleared: true,
    error: null,
  };
}

/** Migrate every user that still has legacy feed rows (admin / one-shot). */
export async function migrateAllLegacyTempTablesToDevices(): Promise<{
  users: number;
  cleared: number;
  errors: string[];
}> {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("user_temp_feeds")
    .select("user_id");

  if (error) {
    return { users: 0, cleared: 0, errors: [error.message] };
  }

  const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
  let cleared = 0;
  const errors: string[] = [];

  for (const userId of userIds) {
    const result = await migrateLegacyTempTablesToDevices(userId);
    if (result.error) {
      errors.push(`${userId}: ${result.error}`);
      continue;
    }
    if (result.cleared) cleared += 1;
  }

  return { users: userIds.length, cleared, errors };
}

export async function saveUserTempConfig(
  userId: string,
  feeds: TempFeedConfig[],
  probes: TempProbeConfig[],
): Promise<{ error: Error | null }> {
  const sanitizedFeeds = sanitizeTempFeeds(feeds);
  const sanitizedProbes = sanitizeTempProbes(probes, sanitizedFeeds);

  // Devices are the source of truth — do not write legacy tables.
  try {
    const { getOrCreateHouseholdForUser } = await import("./households");
    const { savePullDevicesForHousehold } = await import("./devices");
    const household = await getOrCreateHouseholdForUser(userId);
    if (household.householdId) {
      const sync = await savePullDevicesForHousehold(
        household.householdId,
        sanitizedFeeds,
        sanitizedProbes,
      );
      if (sync.error) {
        return { error: new Error(sync.error) };
      }
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error("Failed to save pull devices"),
    };
  }

  // Drop any leftover legacy rows for this user.
  const supabase = createServerClient();
  await supabase.from("user_temp_probes").delete().eq("user_id", userId);
  await supabase.from("user_temp_feeds").delete().eq("user_id", userId);

  return { error: null };
}

async function getCurrentTempConfig(userId: string): Promise<TempConfigRow> {
  const { getUserDevicesAsTempConfig } = await import("./devices");
  const fromDevices = await getUserDevicesAsTempConfig(userId);
  if (fromDevices.householdId) {
    return { feeds: fromDevices.feeds, probes: fromDevices.probes };
  }

  const stored = await fetchUserTempConfig(userId);
  if (stored.hasCustomConfig) {
    return { feeds: stored.feeds, probes: stored.probes };
  }

  return {
    feeds: getDefaultTempFeeds(),
    probes: getDefaultTempProbes(),
  };
}

/** Save pull feeds and probe labels in one step (feeds-only omits probe renames). */
export async function saveUserPullSetup(
  userId: string,
  feeds: TempFeedConfig[],
  probes: TempProbeConfig[] | null,
): Promise<{ error: Error | null; discoveredProbes?: number }> {
  const current = await getCurrentTempConfig(userId);
  const sanitizedFeeds = sanitizeTempFeeds(feeds.length > 0 ? feeds : getDefaultTempFeeds());
  const baseProbes =
    probes ??
    current.probes.filter((probe) =>
      sanitizedFeeds.some((feed) => feed.id === probe.feedId),
    );
  const sanitizedProbes = sanitizeTempProbes(baseProbes, sanitizedFeeds);

  const { feeds: mergedFeeds, probes: mergedProbes, discovered } =
    await discoverAndMergeFeedProbes(sanitizedFeeds, sanitizedProbes);

  const result = await saveUserTempConfig(userId, mergedFeeds, mergedProbes);
  if (result.error) {
    return result;
  }
  return { error: null, discoveredProbes: discovered };
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
  // Prefer devices model; migrate leftover legacy table rows first.
  await migrateLegacyTempTablesToDevices(user.id, user.email);

  const { getUserDevicesAsTempConfig } = await import("./devices");
  const fromDevices = await getUserDevicesAsTempConfig(user.id, user.email);
  if (fromDevices.feeds.length > 0 || fromDevices.devices.length > 0) {
    return {
      feeds: fromDevices.feeds.length > 0 ? fromDevices.feeds : getDefaultTempFeeds(),
      probes: fromDevices.probes.length > 0 ? fromDevices.probes : getDefaultTempProbes(),
      error: fromDevices.error,
    };
  }

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
