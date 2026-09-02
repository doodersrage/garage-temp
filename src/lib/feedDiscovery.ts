import {
  isHomeAssistantStatePayload,
  isSenMLPayload,
  parseHomeAssistantPayload,
  parseSenMLPayload,
  senmlNameToProbeKey,
} from "./feedFormats";
import type { TempProbeConfig } from "./tempFeedConfig";
import { parseTempFeedPayload, sanitizeJsonRoot } from "./tempFeedConfig";

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
    if (typeof attributes.friendly_name !== "string") continue;
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
