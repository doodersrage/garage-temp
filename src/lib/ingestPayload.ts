import type { SensorKind } from "./devices";
import type { TempReading } from "./tempFeedConfig";

export type TypedSensorValue = {
  key: string;
  kind?: SensorKind;
  value?: number | null;
  bool?: boolean | null;
  text?: string | null;
  label?: string;
  unit?: string;
};

export function parseIngestPayload(payload: unknown): {
  tempProbes: Record<string, TempReading>;
  typed: TypedSensorValue[];
} {
  const typed: TypedSensorValue[] = [];
  const tempProbes: Record<string, TempReading> = {};

  if (!payload || typeof payload !== "object") {
    return { tempProbes, typed };
  }

  const body = payload as Record<string, unknown>;

  if (body.temp && typeof body.temp === "object") {
    for (const [key, value] of Object.entries(body.temp as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const reading = value as Record<string, unknown>;
      const c = Number(reading.c);
      const f = Number(reading.f);
      const h = Number(reading.h);
      if (![c, f, h].every(Number.isFinite)) continue;
      tempProbes[key] = { c, f, h };
    }
  }

  if (Array.isArray(body.sensors)) {
    for (const item of body.sensors) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (typeof row.key !== "string") continue;
      typed.push({
        key: row.key,
        kind: typeof row.kind === "string" ? (row.kind as SensorKind) : undefined,
        value: typeof row.value === "number" ? row.value : null,
        bool: typeof row.bool === "boolean" ? row.bool : null,
        text: typeof row.text === "string" ? row.text : null,
        label: typeof row.label === "string" ? row.label : undefined,
        unit: typeof row.unit === "string" ? row.unit : undefined,
      });
    }
  }

  return { tempProbes, typed };
}

/** Infer kind when not provided. */
export function inferSensorKind(key: string, value: TypedSensorValue): SensorKind {
  if (value.kind) return value.kind;
  if (typeof value.bool === "boolean") {
    const k = key.toLowerCase();
    if (k.includes("door")) return "door";
    if (k.includes("power") || k.includes("relay")) return "power";
    if (k.includes("flood") || k.includes("leak")) return "flood";
    return "generic";
  }
  const k = key.toLowerCase();
  if (k.includes("co2") || k.includes("co₂")) return "co2";
  if (k.includes("humid")) return "humidity";
  if (k.includes("temp")) return "temperature";
  return "generic";
}
