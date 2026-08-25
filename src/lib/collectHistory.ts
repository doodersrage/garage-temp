import { createAdminClient, createServerClient } from "./supabase";
import { fetchTemps } from "./FetchTemps";
import { getUserDevicesAsTempConfig } from "./devices";
import { listAllHouseholdOwnerUserIds } from "./households";
import {
  maybeSendRateAndOutageAlerts,
  maybeSendThresholdAlerts,
} from "./alertNotifications";
import { getAlertSettingsForUser } from "./notify";

export type FeedHealthStatus = {
  feedId: string;
  feedName: string;
  url: string;
  ok: boolean;
  message: string;
  probeCount: number;
  checkedAt: string;
  userId?: string;
  userEmail?: string | null;
};

export async function checkFeedHealth(
  userId: string,
): Promise<{ statuses: FeedHealthStatus[]; error: string | null }> {
  const config = await getUserDevicesAsTempConfig(userId);

  if (config.error) {
    return { statuses: [], error: config.error };
  }

  const enabledFeeds = config.feeds.filter((feed) => feed.enabled);
  const results = await fetchTemps({
    feeds: enabledFeeds,
    probes: config.probes,
    devices: config.devices,
    householdId: config.householdId,
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
        userId,
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
      userId,
    };
  });

  return { statuses, error: null };
}

export async function collectAllUsersFeedHealth(): Promise<{
  statuses: FeedHealthStatus[];
  errors: string[];
}> {
  const errors: string[] = [];
  const statuses: FeedHealthStatus[] = [];
  const userIds = await listAllHouseholdOwnerUserIds();
  const admin = createAdminClient();

  for (const userId of userIds) {
    const { data: userData } = await admin.auth.admin.getUserById(userId);
    const userEmail = userData.user?.email ?? null;

    const health = await checkFeedHealth(userId);
    if (health.error) {
      errors.push(`${userEmail ?? userId}: ${health.error}`);
      continue;
    }

    statuses.push(
      ...health.statuses.map((status) => ({
        ...status,
        userEmail,
      })),
    );
  }

  return { statuses, errors };
}

export async function collectHistoryForAllUsers(): Promise<{
  usersProcessed: number;
  errors: string[];
}> {
  const admin = createAdminClient();
  const errors: string[] = [];
  let usersProcessed = 0;

  // Include every household owner — seeds default pull device when needed
  const userIds = await listAllHouseholdOwnerUserIds();

  // Also include users who only have legacy feeds and somehow missed household
  const supabase = createServerClient();
  const { data: feedRows } = await supabase.from("user_temp_feeds").select("user_id");
  for (const row of feedRows ?? []) {
    if (!userIds.includes(row.user_id)) {
      userIds.push(row.user_id);
    }
  }

  for (const userId of userIds) {
    try {
      const { data: userData } = await admin.auth.admin.getUserById(userId);
      const authUser = userData.user;
      const config = await getUserDevicesAsTempConfig(userId, authUser?.email);

      if (config.error) {
        errors.push(`${userId}: ${config.error}`);
        continue;
      }

      const visibleProbes = config.probes.filter((probe) => probe.visible);
      const results = await fetchTemps({
        feeds: config.feeds,
        probes: visibleProbes,
        devices: config.devices,
        householdId: config.householdId,
        saveToDatabase: true,
        userId,
        userEmail: authUser?.email,
        sendAlerts: false,
      });

      await maybeSendThresholdAlerts(
        userId,
        authUser?.email,
        authUser?.user_metadata as Record<string, unknown> | undefined,
        config.feeds,
        config.probes,
        results,
      );

      const settings = await getAlertSettingsForUser(
        userId,
        authUser?.user_metadata as Record<string, unknown> | undefined,
      );
      await maybeSendRateAndOutageAlerts(
        userId,
        authUser?.email,
        config.devices,
        settings,
      );

      usersProcessed += 1;
    } catch (e) {
      errors.push(
        `${userId}: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  }

  return { usersProcessed, errors };
}
