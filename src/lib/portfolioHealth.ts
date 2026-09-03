import type { PropertySnapshot } from "./crossProperty";
import { STALE_MS } from "./relativeTime";

export type PropertyHealth = {
  score: number;
  label: "healthy" | "watch" | "at_risk" | "offline";
  detail: string;
};

/** Score a portfolio property for the table + coldest-properties digest. */
export function scorePropertyHealth(property: PropertySnapshot, nowMs = Date.now()): PropertyHealth {
  if (property.deviceCount <= 0) {
    return {
      score: 20,
      label: "offline",
      detail: "No devices, add a probe",
    };
  }

  if (!property.lastReadingAt) {
    return {
      score: 30,
      label: "offline",
      detail: "Waiting for first reading",
    };
  }

  const ageMs = nowMs - Date.parse(property.lastReadingAt);
  const stale = !Number.isFinite(ageMs) || ageMs >= STALE_MS;

  if (property.floodWet) {
    return {
      score: stale ? 10 : 20,
      label: "at_risk",
      detail: "Flood / leak contact wet",
    };
  }

  if (property.atRisk) {
    return {
      score: stale ? 15 : 25,
      label: "at_risk",
      detail:
        property.minTempF != null
          ? `${property.minTempF.toFixed(1)}°F ≤ ${property.freezeThresholdF}°F`
          : "At freeze threshold",
    };
  }

  if (stale) {
    return {
      score: 45,
      label: "watch",
      detail: "Probe data stale, check power/Wi‑Fi",
    };
  }

  const near =
    property.minTempF != null &&
    property.minTempF <= property.freezeThresholdF + 5;

  if (near) {
    return {
      score: 70,
      label: "watch",
      detail: `Within 5°F of ${property.freezeThresholdF}°F`,
    };
  }

  return {
    score: 95,
    label: "healthy",
    detail: "Reporting, above freeze, dry flood contacts",
  };
}

export function attachPropertyHealth(
  properties: PropertySnapshot[],
  nowMs = Date.now(),
): Array<PropertySnapshot & { health: PropertyHealth }> {
  return properties.map((property) => ({
    ...property,
    health: scorePropertyHealth(property, nowMs),
  }));
}
