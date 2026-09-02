/**
 * Single Overview status: is the monitored space OK, worth watching, or at freeze risk?
 */

export type GarageRiskLevel = "ok" | "watch" | "risk" | "offline";

export type GarageRiskStatus = {
  level: GarageRiskLevel;
  title: string;
  detail: string;
  actionLabel: string;
  actionHref: string;
};

export function computeGarageRiskStatus(input: {
  hasDevices: boolean;
  hasLiveReading: boolean;
  coldestProbeTempF: number | null;
  freezeThresholdF: number;
  staleSensorCount: number;
  nightsRiskCount: number;
  alertsEnabled: boolean;
  hasEmailAlerts: boolean;
  outdoorTempF: number | null;
  showColdSnapChecklist: boolean;
}): GarageRiskStatus {
  if (!input.hasDevices) {
    return {
      level: "watch",
      title: "Add a probe to start",
      detail: "Create a push device, then POST a reading — or try the demo feed without hardware.",
      actionLabel: "Connect a device",
      actionHref: "/dashboard/temperature",
    };
  }

  if (!input.hasLiveReading) {
    return {
      level: "offline",
      title: "Waiting for a reading",
      detail: "Your device is set up but has not reported yet. Finish ingest, then confirm freeze alerts.",
      actionLabel: "Finish device setup",
      actionHref: "/dashboard/temperature",
    };
  }

  if (input.staleSensorCount > 0) {
    return {
      level: "watch",
      title: "Sensor may be offline",
      detail: `${input.staleSensorCount} probe${input.staleSensorCount === 1 ? "" : "s"} look stale — check power, Wi‑Fi, or outage alerts.`,
      actionLabel: "Check devices",
      actionHref: "/dashboard/temperature",
    };
  }

  const belowFreeze =
    input.coldestProbeTempF != null &&
    Number.isFinite(input.coldestProbeTempF) &&
    input.coldestProbeTempF <= input.freezeThresholdF;

  if (belowFreeze) {
    return {
      level: "risk",
      title: "Freeze risk right now",
      detail: `Coldest probe is ${input.coldestProbeTempF!.toFixed(1)}°F (threshold ${input.freezeThresholdF}°F).`,
      actionLabel: "Open alerts",
      actionHref: "/dashboard/alerts",
    };
  }

  if (input.showColdSnapChecklist || input.nightsRiskCount > 0) {
    return {
      level: "watch",
      title:
        input.nightsRiskCount > 0
          ? `${input.nightsRiskCount} night${input.nightsRiskCount === 1 ? "" : "s"} at freeze risk`
          : "Cold snap ahead",
      detail: "Outdoor conditions look cold — run the checklist and confirm forecast alerts are on.",
      actionLabel: "Cold-snap checklist",
      actionHref: "#cold-snap",
    };
  }

  if (!input.alertsEnabled || !input.hasEmailAlerts) {
    return {
      level: "watch",
      title: "Space looks fine — finish alerts",
      detail: "Turn on freeze alerts and email so you hear about the next cold night.",
      actionLabel: "Set freeze + email",
      actionHref: "/dashboard/alerts#alert-section-essentials",
    };
  }

  const nearFreeze =
    input.coldestProbeTempF != null &&
    Number.isFinite(input.coldestProbeTempF) &&
    input.coldestProbeTempF <= input.freezeThresholdF + 5;

  if (nearFreeze) {
    return {
      level: "watch",
      title: "Close to freeze threshold",
      detail: `Coldest probe ${input.coldestProbeTempF!.toFixed(1)}°F — within 5°F of ${input.freezeThresholdF}°F.`,
      actionLabel: "View Home",
      actionHref: "/",
    };
  }

  return {
    level: "ok",
    title: "Looking good",
    detail: "Probes are reporting and nothing is at freeze threshold right now.",
    actionLabel: "View Home",
    actionHref: "/",
  };
}
