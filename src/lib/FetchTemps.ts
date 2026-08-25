import { createServerClient } from "./supabase";
import type { TempFeedConfig, TempFeedResult, TempProbeConfig, TempReading } from "./tempFeedConfig";
import {
  getDefaultTempFeeds,
  getDefaultTempProbes,
  parseTempFeedPayload,
} from "./tempFeedConfig";
import { maybeSendThresholdAlerts } from "./alertNotifications";
import {
  buildReadingRowsFromTempResults,
  insertSensorReadings,
} from "./sensorReadings";
import {
  ensureDefaultPullDevice,
  getUserDevicesAsTempConfig,
  touchDeviceLastSeen,
  type DeviceWithSensors,
} from "./devices";

export type FetchTempsOptions = {
  feeds?: TempFeedConfig[];
  probes?: TempProbeConfig[];
  saveToDatabase?: boolean;
  userId?: string | null;
  userEmail?: string | null;
  userMetadata?: Record<string, unknown>;
  sendAlerts?: boolean;
  householdId?: string | null;
  devices?: DeviceWithSensors[];
};

async function saveProbeReadingsLegacy(
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
  let feeds = options.feeds;
  let probes = options.probes;
  let devices = options.devices;
  let householdId = options.householdId;

  if (options.userId && (!feeds || !probes)) {
    const config = await getUserDevicesAsTempConfig(options.userId, options.userEmail);
    feeds = feeds ?? config.feeds;
    probes = probes ?? config.probes;
    devices = devices ?? config.devices;
    householdId = householdId ?? config.householdId;
  }

  feeds = (feeds ?? getDefaultTempFeeds()).filter((feed) => feed.enabled);
  probes = probes ?? getDefaultTempProbes();
  const results = await Promise.all(feeds.map((feed) => fetchTempFeed(feed)));

  if (options.saveToDatabase !== false && options.userId) {
    const visibleProbes = probes.filter((probe) => probe.visible);

    // Prefer sensor_readings when household/devices available
    if (householdId && devices && devices.length > 0) {
      const rows = buildReadingRowsFromTempResults(
        householdId,
        devices,
        results,
        visibleProbes,
      );
      const { error } = await insertSensorReadings(rows);
      if (error) {
        console.error("Failed to save sensor readings:", error);
      }

      for (const result of results) {
        if (!result.error) {
          await touchDeviceLastSeen(result.id);
        }
      }

      // Keep legacy table in sync for older history UI paths until fully cut over
      await saveProbeReadingsLegacy(results, visibleProbes, options.userId);
    } else {
      await saveProbeReadingsLegacy(results, visibleProbes, options.userId);
    }

    if (options.sendAlerts !== false) {
      await maybeSendThresholdAlerts(
        options.userId,
        options.userEmail,
        options.userMetadata,
        feeds,
        visibleProbes,
        results,
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

export { ensureDefaultPullDevice };
