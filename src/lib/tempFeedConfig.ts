export type TempReading = {
  c: number;
  f: number;
  h: number;
};

export type TempFeedConfig = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
};

export type TempProbeConfig = {
  id: string;
  feedId: string;
  key: string;
  label: string;
  visible: boolean;
};

export type TempFeedResult = {
  id: string;
  name: string;
  url: string;
  probes: Record<string, TempReading>;
  error?: string;
};

export const MAX_TEMP_FEEDS = 6;
export const MAX_TEMP_PROBES = 12;

export function getDefaultFeedUrl(): string {
  return (
    String(import.meta.env.GARAGE_TEMP_FEED_URL ?? "https://garage.robmcd.name/")
      .replace(/\r/g, "")
      .trim() || "https://garage.robmcd.name/"
  );
}

export function getDefaultTempFeeds(): TempFeedConfig[] {
  return [
    {
      id: "garage",
      name: "Garage",
      url: getDefaultFeedUrl(),
      enabled: true,
    },
  ];
}

export function getDefaultTempProbes(): TempProbeConfig[] {
  return [
    { id: "garage-0", feedId: "garage", key: "0", label: "Probe 0", visible: true },
    { id: "garage-1", feedId: "garage", key: "1", label: "Probe 1", visible: true },
    { id: "garage-avg", feedId: "garage", key: "avg", label: "Average", visible: true },
  ];
};

export function isValidFeedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function slugifyFeedId(value: string, index: number): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `feed-${index}`;
}

function normalizeReading(raw: Partial<TempReading> | null | undefined): TempReading {
  return {
    c: raw?.c ?? 0,
    f: raw?.f ?? 0,
    h: raw?.h ?? 0,
  };
}

function coerceNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function parseTempFeedPayload(payload: unknown): Record<string, TempReading> {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid temperature feed payload");
  }

  const tempRoot = (payload as { temp?: unknown }).temp;
  if (!tempRoot || typeof tempRoot !== "object") {
    throw new Error("Temperature feed is missing a temp object");
  }

  const probes: Record<string, TempReading> = {};

  for (const [key, value] of Object.entries(tempRoot as Record<string, unknown>)) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const reading = value as Record<string, unknown>;
    probes[key] = normalizeReading({
      c: coerceNumber(reading.c),
      f: coerceNumber(reading.f),
      h: coerceNumber(reading.h),
    });
  }

  if (Object.keys(probes).length === 0) {
    throw new Error("Temperature feed did not contain any probes");
  }

  return ensureAverageProbe(probes);
}

export function ensureAverageProbe(
  probes: Record<string, TempReading>,
): Record<string, TempReading> {
  if (probes.avg) {
    probes.avg = normalizeReading(probes.avg);
    return probes;
  }

  const numericProbes = Object.entries(probes).filter(([key]) => key !== "avg");
  if (numericProbes.length === 0) {
    return probes;
  }

  const totals = numericProbes.reduce(
    (acc, [, reading]) => ({
      c: acc.c + reading.c,
      f: acc.f + reading.f,
      h: acc.h + reading.h,
    }),
    { c: 0, f: 0, h: 0 },
  );

  const count = numericProbes.length;
  probes.avg = {
    c: totals.c / count,
    f: totals.f / count,
    h: totals.h / count,
  };

  return probes;
}

function sanitizeFeed(raw: unknown, index: number): TempFeedConfig | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const feed = raw as Record<string, unknown>;
  const url = typeof feed.url === "string" ? feed.url.trim() : "";
  if (!url || !isValidFeedUrl(url)) {
    return null;
  }

  const name =
    typeof feed.name === "string" && feed.name.trim()
      ? feed.name.trim()
      : `Feed ${index + 1}`;

  const id =
    typeof feed.id === "string" && feed.id.trim()
      ? feed.id.trim()
      : slugifyFeedId(name, index);

  return {
    id,
    name,
    url,
    enabled: feed.enabled !== false,
  };
}

function sanitizeProbe(raw: unknown, index: number, feedIds: Set<string>): TempProbeConfig | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const probe = raw as Record<string, unknown>;
  const key = typeof probe.key === "string" ? probe.key.trim() : "";
  const feedId = typeof probe.feedId === "string" ? probe.feedId.trim() : "";

  if (!key || !feedId || !feedIds.has(feedId)) {
    return null;
  }

  const label =
    typeof probe.label === "string" && probe.label.trim()
      ? probe.label.trim()
      : `Probe ${key}`;

  const id =
    typeof probe.id === "string" && probe.id.trim()
      ? probe.id.trim()
      : `${feedId}-${key}-${index}`;

  return {
    id,
    feedId,
    key,
    label,
    visible: probe.visible !== false,
  };
}

export function sanitizeTempFeeds(feeds: unknown): TempFeedConfig[] {
  if (!Array.isArray(feeds)) {
    return getDefaultTempFeeds();
  }

  const sanitized = feeds
    .map((feed, index) => sanitizeFeed(feed, index))
    .filter((feed): feed is TempFeedConfig => feed !== null);

  return sanitized.length > 0 ? sanitized : getDefaultTempFeeds();
}

export function sanitizeTempProbes(
  probes: unknown,
  feeds: TempFeedConfig[],
): TempProbeConfig[] {
  const feedIds = new Set(feeds.map((feed) => feed.id));

  if (!Array.isArray(probes)) {
    return getDefaultTempProbes().filter((probe) => feedIds.has(probe.feedId));
  }

  const sanitized = probes
    .map((probe, index) => sanitizeProbe(probe, index, feedIds))
    .filter((probe): probe is TempProbeConfig => probe !== null);

  if (sanitized.length > 0) {
    return sanitized;
  }

  return getDefaultTempProbes().filter((probe) => feedIds.has(probe.feedId));
}

export function parseTempFeedsFromFormData(formData: FormData): TempFeedConfig[] {
  const feeds: TempFeedConfig[] = [];

  for (let index = 0; index < MAX_TEMP_FEEDS; index++) {
    const url = formData.get(`feed_${index}_url`)?.toString().trim() ?? "";
    if (!url) {
      continue;
    }

    if (!isValidFeedUrl(url)) {
      continue;
    }

    const name =
      formData.get(`feed_${index}_name`)?.toString().trim() || `Feed ${index + 1}`;
    const id =
      formData.get(`feed_${index}_id`)?.toString().trim() || slugifyFeedId(name, index);

    feeds.push({
      id,
      name,
      url,
      enabled: formData.has(`feed_${index}_enabled`),
    });
  }

  return feeds.length > 0 ? feeds : getDefaultTempFeeds();
}

export function parseTempProbesFromFormData(
  formData: FormData,
  feeds: TempFeedConfig[],
): TempProbeConfig[] {
  const feedIds = new Set(feeds.map((feed) => feed.id));
  const probes: TempProbeConfig[] = [];

  for (let index = 0; index < MAX_TEMP_PROBES; index++) {
    const key = formData.get(`probe_${index}_key`)?.toString().trim() ?? "";
    const feedId = formData.get(`probe_${index}_feed_id`)?.toString().trim() ?? "";

    if (!key || !feedId || !feedIds.has(feedId)) {
      continue;
    }

    const label =
      formData.get(`probe_${index}_label`)?.toString().trim() || `Probe ${key}`;
    const id =
      formData.get(`probe_${index}_id`)?.toString().trim() ||
      `${feedId}-${key}-${index}`;

    probes.push({
      id,
      feedId,
      key,
      label,
      visible: formData.has(`probe_${index}_visible`),
    });
  }

  return probes.length > 0
    ? probes
    : getDefaultTempProbes().filter((probe) => feedIds.has(probe.feedId));
}

export function getLegacyTempProbes(metadata: Record<string, unknown>): TempProbeConfig[] {
  return getDefaultTempProbes().map((probe) => {
    if (probe.key === "0") {
      return { ...probe, visible: metadata.show_probe_0 !== false };
    }
    if (probe.key === "1") {
      return { ...probe, visible: metadata.show_probe_1 !== false };
    }
    if (probe.key === "avg") {
      return { ...probe, visible: metadata.show_probe_avg !== false };
    }
    return probe;
  });
}

export function usesDefaultTempConfig(
  feeds: TempFeedConfig[],
  probes: TempProbeConfig[],
): boolean {
  const defaultFeeds = getDefaultTempFeeds();
  const defaultProbes = getDefaultTempProbes();

  if (feeds.length !== defaultFeeds.length || probes.length !== defaultProbes.length) {
    return false;
  }

  const feedsMatch = feeds.every((feed, index) => {
    const baseline = defaultFeeds[index];
    return (
      feed.id === baseline.id &&
      feed.url === baseline.url &&
      feed.enabled === baseline.enabled
    );
  });

  const probesMatch = probes.every((probe, index) => {
    const baseline = defaultProbes[index];
    return (
      probe.feedId === baseline.feedId &&
      probe.key === baseline.key &&
      probe.visible === baseline.visible
    );
  });

  return feedsMatch && probesMatch;
}

export type DisplayProbe = {
  id: string;
  label: string;
  key: string;
  feedName: string;
  data: TempReading | null;
};

export type FeedDisplayGroup = {
  feedId: string;
  feedName: string;
  enabled: boolean;
  error?: string;
  probes: DisplayProbe[];
};

export function formatProbeLabelFromKey(key: string): string {
  if (key === "avg") {
    return "Average";
  }

  return `Probe ${key}`;
}

function buildProbesForFeed(
  feed: TempFeedConfig,
  assignedProbes: TempProbeConfig[],
  result: TempFeedResult | undefined,
): DisplayProbe[] {
  const visibleProbes = assignedProbes.filter((probe) => probe.visible);

  if (visibleProbes.length > 0) {
    return visibleProbes.map((probe) => ({
      id: probe.id,
      label: probe.label,
      key: probe.key,
      feedName: feed.name,
      data:
        feed.enabled && result && !result.error
          ? result.probes[probe.key] ?? null
          : null,
    }));
  }

  if (!feed.enabled || !result || result.error) {
    return [];
  }

  return Object.entries(result.probes).map(([key, data]) => ({
    id: `${feed.id}-${key}`,
    label: formatProbeLabelFromKey(key),
    key,
    feedName: feed.name,
    data,
  }));
}

export function buildFeedDisplayGroups(
  feeds: TempFeedConfig[],
  probes: TempProbeConfig[],
  feedResults: TempFeedResult[],
): FeedDisplayGroup[] {
  const resultsById = new Map(feedResults.map((feed) => [feed.id, feed]));

  return feeds.map((feed) => {
    const assignedProbes = probes.filter((probe) => probe.feedId === feed.id);
    const result = resultsById.get(feed.id);
    const error = !feed.enabled
      ? "This feed is disabled in your dashboard settings."
      : result?.error;

    return {
      feedId: feed.id,
      feedName: feed.name,
      enabled: feed.enabled,
      error,
      probes: buildProbesForFeed(feed, assignedProbes, result),
    };
  });
}

export function buildDisplayProbes(
  feedResults: TempFeedResult[],
  probes: TempProbeConfig[],
): DisplayProbe[] {
  const feedsById = new Map(feedResults.map((feed) => [feed.id, feed]));

  return probes
    .filter((probe) => probe.visible)
    .flatMap((probe) => {
    const feed = feedsById.get(probe.feedId);
    if (!feed || feed.error) {
      return [];
    }

    const data = feed.probes[probe.key];
    if (!data) {
      return [];
    }

    return [
      {
        id: probe.id,
        label: probe.label,
        key: probe.key,
        feedName: feed.name,
        data,
      },
    ];
  });
}

export function getPrimaryAverageReading(
  feedResults: TempFeedResult[],
): TempReading | null {
  const firstSuccessfulFeed = feedResults.find((feed) => !feed.error && feed.probes.avg);
  return firstSuccessfulFeed?.probes.avg ?? null;
}
