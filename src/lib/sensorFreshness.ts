import type { DeviceSource, DeviceWithSensors } from "./devices";
import { formatRelativeAge, freshnessDetail, LAG_MS } from "./relativeTime";

export type LatestSensorRow = {
  sensor: { id: string; device_id: string; label: string };
  deviceName: string;
  recorded_at: string;
};

export function isSensorLagging(
  recordedAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!recordedAt) return true;
  const parsed = Date.parse(recordedAt);
  if (Number.isNaN(parsed)) return true;
  return now - parsed >= LAG_MS;
}

export type StaleSensorSummary = {
  total: number;
  pushCount: number;
  pullCount: number;
  unknownCount: number;
  bannerMessage: string;
};

export function summarizeStaleSensors(
  latest: LatestSensorRow[],
  devices: DeviceWithSensors[],
  now = Date.now(),
): StaleSensorSummary {
  const sourceByDeviceId = new Map(devices.map((d) => [d.id, d.source]));

  let pushCount = 0;
  let pullCount = 0;
  let unknownCount = 0;

  for (const row of latest) {
    if (!isSensorLagging(row.recorded_at, now)) continue;

    const source = sourceByDeviceId.get(row.sensor.device_id);
    if (source === "push") pushCount += 1;
    else if (source === "pull_url") pullCount += 1;
    else unknownCount += 1;
  }

  const total = pushCount + pullCount + unknownCount;
  const bannerMessage = buildStaleBannerMessage({
    total,
    pushCount,
    pullCount,
    unknownCount,
  });

  return { total, pushCount, pullCount, unknownCount, bannerMessage };
}

function buildStaleBannerMessage(counts: {
  total: number;
  pushCount: number;
  pullCount: number;
  unknownCount: number;
}): string {
  const { total, pushCount, pullCount, unknownCount } = counts;
  if (total === 0) return "";

  const noun = total === 1 ? "probe" : "probes";

  if (pullCount === total) {
    return `${total} pull ${noun} ${total === 1 ? "hasn't" : "haven't"} been polled in 30+ minutes`;
  }
  if (pushCount === total) {
    return `${total} ${noun} ${total === 1 ? "hasn't" : "haven't"} posted in 30+ minutes`;
  }

  const parts: string[] = [];
  if (pushCount > 0) parts.push(`${pushCount} push`);
  if (pullCount > 0) parts.push(`${pullCount} pull`);
  if (unknownCount > 0) parts.push(`${unknownCount} unknown`);

  return `${total} ${noun} look stale (${parts.join(", ")})`;
}

export function freshnessDetailForSource(
  recordedAt: string | null | undefined,
  source: DeviceSource | null | undefined,
  neverLabel = "never",
): string {
  const age = formatRelativeAge(recordedAt, neverLabel);
  if (!age.lagging) {
    return source === "pull_url"
      ? `Polled ${age.label}`
      : `Updated ${age.label}`;
  }

  if (source === "pull_url") {
    return age.stale
      ? `Offline · last polled ${age.label}`
      : `Awaiting poll · last polled ${age.label}`;
  }

  return freshnessDetail(age);
}
