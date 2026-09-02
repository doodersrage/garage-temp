import {
  isHomeAssistantStatePayload,
  isSenMLPayload,
  parseHomeAssistantPayload,
  parseSenMLPayload,
  senmlNameToProbeKey,
} from "./feedFormats";
import { inferSensorKind, parseIngestPayload } from "./ingestPayload";
import type { SensorKind } from "./sensorKinds";
import type { TempProbeConfig } from "./tempFeedConfig";
import { parseTempFeedPayload, sanitizeJsonRoot, type TempFeedConfig } from "./tempFeedConfig";
import type { DiscoveredPushSensor } from "./pushSensorDiscovery";

export type DiscoveredProbe = {
  key: string;
  suggestedLabel: string;
  tempF: number | null;
  humidity: number | null;
  visible: boolean;
  source: "native" | "senml" | "homeassistant" | "computed";
};

export type FeedDiscoveryResult = {
  format: "native" | "senml" | "homeassistant";
  jsonRoot: string;
  probes: DiscoveredProbe[];
};

const ROOT_CANDIDATES = ["temp", "readings", "data", "probes", "sensors"];

function humanizeProbeKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return "Probe";
  if (trimmed === "avg") return "Average";
  if (/^\d+$/.test(trimmed)) return `Probe ${trimmed}`;
  if (trimmed === "state") return "Sensor";
  return trimmed
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractSenMLLabelHints(payload: unknown): Map<string, string> {
  const hints = new Map<string, string>();
  const records = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { e?: unknown[] }).e)
      ? ((payload as { e: unknown[] }).e as Array<{ n?: string; u?: string }>)
      : null;
  if (!records) return hints;

  for (const row of records) {
    if (typeof row.n !== "string") continue;
    const key = senmlNameToProbeKey(row.n);
    const unit = typeof row.u === "string" ? row.u : "";
    if (unit === "%RH" || /humid|rh/i.test(row.n)) continue;
    const label = row.n
      .replace(/^\/+/, "")
      .split("/")
      .filter(Boolean)
      .slice(-2)
      .join(" · ")
      .replace(/[-_]?(temp(erature)?|rh|humidity)$/i, "")
      .trim();
    if (label && label !== key) {
      hints.set(key, humanizeProbeKey(label));
    }
  }
  return hints;
}

function extractHomeAssistantLabelHints(payload: unknown): Map<string, string> {
  const hints = new Map<string, string>();
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return hints;
  }
  const body = payload as Record<string, unknown>;

  if ("state" in body) {
    const attributes =
      body.attributes && typeof body.attributes === "object"
        ? (body.attributes as Record<string, unknown>)
        : {};
    if (typeof attributes.friendly_name === "string") {
      hints.set("state", attributes.friendly_name.trim());
    }
    return hints;
  }

  for (const [entityKey, value] of Object.entries(body)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const entity = value as Record<string, unknown>;
    const attributes =
      entity.attributes && typeof entity.attributes === "object"
        ? (entity.attributes as Record<string, unknown>)
        : {};
    if (typeof attributes.friendly_name !== "string") {
      const probeKey = entityKey.includes(".")
        ? entityKey.split(".").slice(1).join("_")
        : entityKey;
      hints.set(probeKey, humanizeProbeKey(probeKey));
      continue;
    }
    const probeKey = entityKey.includes(".")
      ? entityKey.split(".").slice(1).join("_")
      : entityKey;
    hints.set(probeKey, attributes.friendly_name.trim());
  }
  return hints;
}

function defaultVisibleForKey(key: string): boolean {
  return key !== "avg";
}

function probesFromReadings(
  probes: Record<string, { f: number; c: number; h: number }>,
  labelHints: Map<string, string>,
  format: FeedDiscoveryResult["format"],
): DiscoveredProbe[] {
  return Object.entries(probes).map(([key, reading]) => ({
    key,
    suggestedLabel: labelHints.get(key) ?? humanizeProbeKey(key),
    tempF: Number.isFinite(reading.f) ? reading.f : null,
    humidity: Number.isFinite(reading.h) ? reading.h : null,
    visible: defaultVisibleForKey(key),
    source: key === "avg" ? "computed" : format,
  }));
}

/** Parse a pull-feed payload and return probe keys with suggested Home labels. */
export function discoverFeedProbes(
  payload: unknown,
  jsonRootHint?: string,
): FeedDiscoveryResult {
  const hint = jsonRootHint ? sanitizeJsonRoot(jsonRootHint) : "temp";
  const rootsToTry = [...new Set([hint, ...ROOT_CANDIDATES])];

  if (isSenMLPayload(payload)) {
    const parsed = parseSenMLPayload(payload);
    if (Object.keys(parsed.tempProbes).length > 0) {
      return {
        format: "senml",
        jsonRoot: hint,
        probes: probesFromReadings(
          parsed.tempProbes,
          extractSenMLLabelHints(payload),
          "senml",
        ),
      };
    }
  }

  if (isHomeAssistantStatePayload(payload)) {
    const parsed = parseHomeAssistantPayload(payload);
    if (Object.keys(parsed.tempProbes).length > 0) {
      return {
        format: "homeassistant",
        jsonRoot: hint,
        probes: probesFromReadings(
          parsed.tempProbes,
          extractHomeAssistantLabelHints(payload),
          "homeassistant",
        ),
      };
    }
  }

  let lastError: Error | null = null;
  for (const root of rootsToTry) {
    try {
      const probes = parseTempFeedPayload(payload, root);
      return {
        format: "native",
        jsonRoot: root,
        probes: probesFromReadings(probes, new Map(), "native"),
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Invalid feed payload");
    }
  }

  throw lastError ?? new Error("Temperature feed did not contain any probes");
}

/** Merge discovered keys into existing probe config, preserving user labels. */
export function mergeDiscoveredProbes(
  existing: TempProbeConfig[],
  feedId: string,
  discovered: DiscoveredProbe[],
): TempProbeConfig[] {
  const otherFeeds = existing.filter((probe) => probe.feedId !== feedId);
  const existingForFeed = existing.filter((probe) => probe.feedId === feedId);
  const existingByKey = new Map(existingForFeed.map((probe) => [probe.key, probe]));
  const discoveredKeys = new Set(discovered.map((probe) => probe.key));

  const mergedForFeed: TempProbeConfig[] = discovered.map((probe, index) => {
    const prior = existingByKey.get(probe.key);
    return {
      id: prior?.id ?? `${feedId}-${probe.key}`,
      feedId,
      key: probe.key,
      label: prior?.label ?? probe.suggestedLabel,
      visible: prior?.visible ?? probe.visible,
    };
  });

  for (const prior of existingForFeed) {
    if (!discoveredKeys.has(prior.key)) {
      mergedForFeed.push(prior);
    }
  }

  return [...otherFeeds, ...mergedForFeed].slice(0, 12);
}

export function formatProbeReading(probe: DiscoveredProbe): string {
  const parts: string[] = [];
  if (probe.tempF != null) parts.push(`${probe.tempF.toFixed(1)}°F`);
  if (probe.humidity != null && probe.humidity > 0) {
    parts.push(`${probe.humidity.toFixed(0)}% RH`);
  }
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function ingestLabelHints(payload: unknown): Map<string, string> {
  return new Map([
    ...extractSenMLLabelHints(payload),
    ...extractHomeAssistantLabelHints(payload),
  ]);
}

/** Discover push-ingest sensors with suggested labels (temp pairs, typed, flat keys). */
export function discoverIngestPayload(payload: unknown): DiscoveredPushSensor[] {
  const { tempProbes, typed } = parseIngestPayload(payload);
  const hints = ingestLabelHints(payload);
  const discovered: DiscoveredPushSensor[] = [];
  const seen = new Set<string>();

  for (const [key, reading] of Object.entries(tempProbes)) {
    const label = hints.get(key) ?? humanizeProbeKey(key);
    discovered.push({
      key,
      label,
      kind: "temperature",
      visible: defaultVisibleForKey(key),
      withHumiditySibling: key !== "avg",
    });
    seen.add(`${key}::temperature`);
  }

  for (const item of typed) {
    const kind = inferSensorKind(item.key, item);
    const dedupeKey = `${item.key}::${kind}`;
    if (seen.has(dedupeKey)) continue;
    if (kind === "humidity" && seen.has(`${item.key}::temperature`)) continue;

    discovered.push({
      key: item.key,
      label: item.label ?? hints.get(item.key) ?? humanizeProbeKey(item.key),
      kind,
      unit: item.unit ?? null,
      visible: true,
    });
    seen.add(dedupeKey);
  }

  return discovered;
}

/** Fetch a pull feed URL and return discovered probe keys + labels. */
export async function discoverProbesFromFeedUrl(
  url: string,
  jsonRoot?: string,
): Promise<FeedDiscoveryResult> {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) {
    throw new Error(`Feed request failed (${response.status})`);
  }
  const payload = await response.json();
  return discoverFeedProbes(payload, jsonRoot);
}

/** Merge live feed probes into saved config; updates JSON root when auto-detected. */
export async function discoverAndMergeFeedProbes(
  feeds: TempFeedConfig[],
  probes: TempProbeConfig[],
): Promise<{ feeds: TempFeedConfig[]; probes: TempProbeConfig[]; discovered: number }> {
  let nextFeeds = feeds;
  let nextProbes = probes;
  let discovered = 0;

  for (let index = 0; index < nextFeeds.length; index += 1) {
    const feed = nextFeeds[index]!;
    if (!feed.url || !feed.enabled) continue;

    try {
      const result = await discoverProbesFromFeedUrl(feed.url, feed.jsonRoot);
      if (result.probes.length === 0) continue;

      const before = nextProbes.filter((probe) => probe.feedId === feed.id).length;
      nextProbes = mergeDiscoveredProbes(nextProbes, feed.id, result.probes);
      const after = nextProbes.filter((probe) => probe.feedId === feed.id).length;
      discovered += Math.max(0, after - before);

      if (result.jsonRoot && result.jsonRoot !== sanitizeJsonRoot(feed.jsonRoot)) {
        nextFeeds = nextFeeds.map((row, rowIndex) =>
          rowIndex === index ? { ...row, jsonRoot: result.jsonRoot } : row,
        );
      }
    } catch {
      // Keep manual setup when the feed is unreachable during save.
    }
  }

  return { feeds: nextFeeds, probes: nextProbes, discovered };
}
