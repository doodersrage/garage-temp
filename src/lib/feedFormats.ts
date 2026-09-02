import type { TypedSensorValue } from "./ingestPayload";
import type { TempReading } from "./tempFeedConfig";

export type StandardFeedParseResult = {
  tempProbes: Record<string, TempReading>;
  typed: TypedSensorValue[];
  format: "senml" | "homeassistant" | null;
};

type SenMLRecord = {
  n?: string;
  bn?: string;
  u?: string;
  v?: number;
  vb?: boolean;
  vs?: string;
};

const SENML_CEL_UNITS = new Set(["Cel", "cel", "celsius"]);
const SENML_F_UNITS = new Set(["degF", "degf", "fahrenheit"]);
const SENML_RH_UNITS = new Set(["%RH", "%rh", "RH", "rh"]);

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

function emptyProbe(): TempReading {
  return { c: 0, f: 0, h: 0 };
}

function ensureProbe(
  probes: Record<string, TempReading>,
  key: string,
): TempReading {
  if (!probes[key]) probes[key] = emptyProbe();
  return probes[key]!;
}

function senmlRecordsFromPayload(payload: unknown): SenMLRecord[] | null {
  if (Array.isArray(payload)) {
    return payload.every((row) => row && typeof row === "object")
      ? (payload as SenMLRecord[])
      : null;
  }
  if (!payload || typeof payload !== "object") return null;
  const body = payload as Record<string, unknown>;
  if (Array.isArray(body.e)) return body.e as SenMLRecord[];
  if (Array.isArray(body.records)) return body.records as SenMLRecord[];
  return null;
}

/** Last path segment of a SenML name, with optional /temp or /humidity suffix stripped. */
export function senmlNameToProbeKey(name: string): string {
  const trimmed = name.replace(/^\/+/, "").trim();
  if (!trimmed) return "0";
  const parts = trimmed.split("/").filter(Boolean);
  let last = parts[parts.length - 1] ?? trimmed;
  last = last.replace(/[-_]?(temp(erature)?|rh|humidity)$/i, "");
  if (!last && parts.length >= 2) {
    last = parts[parts.length - 2]!;
  }
  return last || "0";
}

export function isSenMLPayload(payload: unknown): boolean {
  const records = senmlRecordsFromPayload(payload);
  if (!records || records.length === 0) return false;
  return records.some(
    (row) =>
      typeof row.n === "string" ||
      typeof row.v === "number" ||
      typeof row.vb === "boolean",
  );
}

export function parseSenMLPayload(payload: unknown): StandardFeedParseResult {
  const tempProbes: Record<string, TempReading> = {};
  const typed: TypedSensorValue[] = [];
  const records = senmlRecordsFromPayload(payload);
  if (!records) {
    return { tempProbes, typed, format: null };
  }

  for (const row of records) {
    const name = typeof row.n === "string" ? row.n : "0";
    const key = senmlNameToProbeKey(name);
    const unit = typeof row.u === "string" ? row.u : "";
    const nameLower = name.toLowerCase();

    if (typeof row.vb === "boolean") {
      typed.push({
        key,
        kind: nameLower.includes("door") ? "door" : "generic",
        bool: row.vb,
        label: key,
      });
      continue;
    }

    if (typeof row.v !== "number" || !Number.isFinite(row.v)) continue;

    if (
      SENML_RH_UNITS.has(unit) ||
      nameLower.includes("humid") ||
      nameLower.endsWith("/rh")
    ) {
      ensureProbe(tempProbes, key).h = round1(row.v);
      continue;
    }

    if (SENML_CEL_UNITS.has(unit) || (unit === "" && nameLower.includes("cel"))) {
      const c = round1(row.v);
      const probe = ensureProbe(tempProbes, key);
      probe.c = c;
      probe.f = round1(celsiusToFahrenheit(c));
      continue;
    }

    if (SENML_F_UNITS.has(unit) || nameLower.includes("temp") || unit === "") {
      const f = round1(row.v);
      const probe = ensureProbe(tempProbes, key);
      probe.f = f;
      probe.c = round1(fahrenheitToCelsius(f));
      continue;
    }
  }

  const hasData =
    Object.values(tempProbes).some((p) => p.f !== 0 || p.h !== 0) || typed.length > 0;

  return {
    tempProbes,
    typed,
    format: hasData ? "senml" : null,
  };
}

function parseHaStateValue(
  state: unknown,
  unit: string | null,
): { temp?: TempReading; typed?: TypedSensorValue; key: string } | null {
  if (state === null || state === undefined) return null;

  const unitNorm = (unit ?? "").trim();
  const unitLower = unitNorm.toLowerCase();

  if (typeof state === "boolean") {
    return {
      key: "state",
      typed: { key: "state", bool: state, kind: "generic" },
    };
  }

  const stateStr = String(state).trim();
  if (!stateStr || stateStr === "unavailable" || stateStr === "unknown") {
    return null;
  }

  const boolStates: Record<string, boolean> = {
    on: true,
    off: false,
    open: true,
    closed: false,
    true: true,
    false: false,
  };
  const boolKey = stateStr.toLowerCase();
  if (boolKey in boolStates) {
    return {
      key: "state",
      typed: {
        key: "state",
        bool: boolStates[boolKey],
        kind: boolKey.includes("open") || boolKey.includes("closed") ? "door" : "generic",
      },
    };
  }

  const num = Number(stateStr);
  if (!Number.isFinite(num)) return null;

  if (unitLower.includes("f") || unitNorm === "°F") {
    const f = round1(num);
    return {
      key: "state",
      temp: { f, c: round1(fahrenheitToCelsius(f)), h: 0 },
    };
  }

  if (unitLower.includes("c") || unitNorm === "°C") {
    const c = round1(num);
    return {
      key: "state",
      temp: { f: round1(celsiusToFahrenheit(c)), c, h: 0 },
    };
  }

  if (unitLower.includes("%")) {
    return {
      key: "state",
      temp: { f: 0, c: 0, h: round1(num) },
    };
  }

  // Default numeric state to °F for REST sensors without unit (common in HA templates).
  const f = round1(num);
  return {
    key: "state",
    temp: { f, c: round1(fahrenheitToCelsius(f)), h: 0 },
  };
}

function parseHomeAssistantEntity(
  entityKey: string,
  entity: Record<string, unknown>,
  tempProbes: Record<string, TempReading>,
  typed: TypedSensorValue[],
): void {
  const attributes =
    entity.attributes && typeof entity.attributes === "object"
      ? (entity.attributes as Record<string, unknown>)
      : {};
  const unit =
    typeof attributes.unit_of_measurement === "string"
      ? attributes.unit_of_measurement
      : null;
  const label =
    typeof attributes.friendly_name === "string"
      ? attributes.friendly_name
      : entityKey;

  const parsed = parseHaStateValue(entity.state, unit);
  if (!parsed) return;

  const key = entityKey.includes(".")
    ? entityKey.split(".").slice(1).join("_")
    : parsed.key;

  if (parsed.temp) {
    const probe = ensureProbe(tempProbes, key);
    if (parsed.temp.f) probe.f = parsed.temp.f;
    if (parsed.temp.c) probe.c = parsed.temp.c;
    if (parsed.temp.h) probe.h = parsed.temp.h;
  }
  if (parsed.typed) {
    typed.push({ ...parsed.typed, key, label });
  }
}

export function isHomeAssistantStatePayload(payload: unknown): boolean {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }
  const body = payload as Record<string, unknown>;
  if ("state" in body) return true;
  return Object.values(body).some(
    (value) =>
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "state" in (value as Record<string, unknown>),
  );
}

export function parseHomeAssistantPayload(payload: unknown): StandardFeedParseResult {
  const tempProbes: Record<string, TempReading> = {};
  const typed: TypedSensorValue[] = [];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { tempProbes, typed, format: null };
  }

  const body = payload as Record<string, unknown>;

  if ("state" in body) {
    const attributes =
      body.attributes && typeof body.attributes === "object"
        ? (body.attributes as Record<string, unknown>)
        : {};
    const unit =
      typeof attributes.unit_of_measurement === "string"
        ? attributes.unit_of_measurement
        : null;
    const parsed = parseHaStateValue(body.state, unit);
    if (parsed?.temp) {
      tempProbes[parsed.key] = parsed.temp;
    }
    if (parsed?.typed) {
      typed.push(parsed.typed);
    }
  } else {
    for (const [entityKey, value] of Object.entries(body)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      if (entityKey === "attributes" || entityKey === "battery_pct" || entityKey === "rssi") {
        continue;
      }
      parseHomeAssistantEntity(entityKey, value as Record<string, unknown>, tempProbes, typed);
    }
  }

  const hasData =
    Object.values(tempProbes).some((p) => p.f !== 0 || p.h !== 0) || typed.length > 0;

  return {
    tempProbes,
    typed,
    format: hasData ? "homeassistant" : null,
  };
}

/** SenML or Home Assistant JSON when native ThermalTrace shapes are absent. */
export function parseStandardFeedPayload(payload: unknown): StandardFeedParseResult {
  if (isSenMLPayload(payload)) {
    const senml = parseSenMLPayload(payload);
    if (senml.format) return senml;
  }
  if (isHomeAssistantStatePayload(payload)) {
    const ha = parseHomeAssistantPayload(payload);
    if (ha.format) return ha;
  }
  return { tempProbes: {}, typed: [], format: null };
}

export function buildSenMLPack(
  probes: Record<string, TempReading>,
  options: { baseName?: string; includeHumidity?: boolean } = {},
): SenMLRecord[] {
  const baseName = options.baseName ?? "thermaltrace/example/";
  const includeHumidity = options.includeHumidity ?? true;
  const records: SenMLRecord[] = [];
  let baseSet = false;

  for (const [key, reading] of Object.entries(probes)) {
    if (key === "avg") continue;
    const row: SenMLRecord = {
      n: key,
      u: "Cel",
      v: reading.c,
    };
    if (!baseSet) {
      row.bn = baseName;
      baseSet = true;
    }
    records.push(row);
    if (includeHumidity && reading.h > 0) {
      records.push({ n: `${key}/rh`, u: "%RH", v: reading.h });
    }
  }

  return records;
}

export function buildHomeAssistantStatePayload(
  probes: Record<string, TempReading>,
  preferredKey = "0",
): Record<string, unknown> {
  const reading = probes[preferredKey] ?? probes[Object.keys(probes)[0]!];
  if (!reading) {
    return { state: "unavailable" };
  }
  return {
    state: reading.f,
    attributes: {
      unit_of_measurement: "°F",
      friendly_name: `Probe ${preferredKey}`,
      humidity: reading.h,
    },
  };
}
