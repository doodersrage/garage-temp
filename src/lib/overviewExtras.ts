import type { DeviceWithSensors } from "./devices";
import {
  computeDoorOpenSessions,
  formatDurationMs,
  type DoorOpenSession,
} from "./doorDuration";
import {
  detectBatteryTrendDrop,
  estimateBatteryDaysRemaining,
  type BatterySample,
} from "./batteryTrend";
import { parseBatteryHistory, batterySparklinePath } from "./batterySparkline";
import {
  fetchRecentBoolReadings,
  getRecentNumericReadingSamples,
} from "./sensorReadings";
import type { ChartPoint } from "./garageTempsHistory";
import { estimateHeatingLossRate } from "./heatingInsights";

export type BatteryOverviewRow = {
  deviceName: string;
  latestPct: number;
  message: string | null;
  daysRemaining: number | null;
  sparkPath: string;
  samples: BatterySample[];
};

export type FloodLevelOverview = {
  floodOpen: Array<{ label: string; since: string }>;
  recentFlood: Array<{ label: string; at: string }>;
  levels: Array<{ label: string; value: number; at: string }>;
};

export type EnergyOverview = {
  label: string;
  latestW: number;
  at: string;
  sampleCount: number;
  avgW: number;
};

/** Parallel door session fetch for Insights (avoids sequential awaits in the card). */
export async function loadDoorSessions24h(
  devices: DeviceWithSensors[],
): Promise<DoorOpenSession[]> {
  const doorSensors = devices.flatMap((device) =>
    device.sensors
      .filter((sensor) => sensor.kind === "door")
      .map((sensor) => ({ device, sensor })),
  );
  if (doorSensors.length === 0) return [];

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const batches = await Promise.all(
    doorSensors.map(async ({ sensor }) => {
      const readings = await fetchRecentBoolReadings(sensor.id, since);
      return computeDoorOpenSessions(
        readings.map((r) => ({
          label: sensor.label,
          kind: "door",
          value: r.value,
          recordedAt: r.recordedAt,
        })),
      );
    }),
  );
  return batches.flat();
}

export function doorOpenMinutesFromSessions(sessions: DoorOpenSession[]): number {
  const now = Date.now();
  let ms = 0;
  for (const session of sessions) {
    if (session.durationMs != null) ms += session.durationMs;
    else if (session.stillOpen) {
      ms += Math.max(0, now - Date.parse(session.openedAt));
    }
  }
  return ms / (60 * 1000);
}

export function buildDoorTempSummary(
  sessions: DoorOpenSession[],
  points: ChartPoint[],
  outdoorTempF: number | null,
): { title: string; detail: string; tone: "warning" | "info" } | null {
  const minutes = doorOpenMinutesFromSessions(sessions);
  const openNow = sessions.filter((s) => s.stillOpen);
  const rate = estimateHeatingLossRate(points, outdoorTempF);
  if (openNow.length > 0) {
    const labels = openNow.map((s) => s.label).join(", ");
    return {
      title: "Door open now",
      detail:
        rate != null && rate < 0
          ? `${labels} — space falling ~${Math.abs(rate).toFixed(1)}°F/h while open.`
          : `${labels} still open (${formatDurationMs(
              Date.now() - Date.parse(openNow[0]!.openedAt),
            )}).`,
      tone: "warning",
    };
  }
  if (minutes >= 10 && rate != null && rate < -0.5) {
    return {
      title: "Door vs temperature",
      detail: `Doors open ~${Math.round(minutes)} min in 24h; space cooled ~${Math.abs(rate).toFixed(1)}°F/h recently.`,
      tone: "warning",
    };
  }
  if (minutes >= 5) {
    return {
      title: "Door activity",
      detail: `About ${Math.round(minutes)} minutes open in the last 24 hours.`,
      tone: "info",
    };
  }
  return null;
}

export function buildBatteryOverview(devices: DeviceWithSensors[]): BatteryOverviewRow[] {
  const rows: BatteryOverviewRow[] = [];
  for (const device of devices) {
    const samples = parseBatteryHistory(device.meta);
    if (samples.length < 2) continue;
    const newest = [...samples].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).at(-1)!;
    const message = detectBatteryTrendDrop(samples);
    const daysRemaining = estimateBatteryDaysRemaining(samples);
    rows.push({
      deviceName: device.name,
      latestPct: newest.pct,
      message,
      daysRemaining,
      sparkPath: batterySparklinePath(samples, 96, 28),
      samples,
    });
  }
  return rows.sort((a, b) => a.latestPct - b.latestPct).slice(0, 4);
}

export async function loadFloodLevelOverview(
  devices: DeviceWithSensors[],
): Promise<FloodLevelOverview> {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const floodSensors = devices.flatMap((d) =>
    d.sensors.filter((s) => s.kind === "flood").map((s) => ({ label: s.label, id: s.id })),
  );
  const levelSensors = devices.flatMap((d) =>
    d.sensors.filter((s) => s.kind === "level").map((s) => ({ label: s.label, id: s.id })),
  );

  const [floodBatches, levelBatches] = await Promise.all([
    Promise.all(
      floodSensors.map(async (sensor) => {
        const readings = await fetchRecentBoolReadings(sensor.id, since);
        return { sensor, readings };
      }),
    ),
    Promise.all(
      levelSensors.map(async (sensor) => {
        const samples = await getRecentNumericReadingSamples(sensor.id, since);
        return { sensor, samples };
      }),
    ),
  ]);

  const floodOpen: FloodLevelOverview["floodOpen"] = [];
  const recentFlood: FloodLevelOverview["recentFlood"] = [];
  for (const { sensor, readings } of floodBatches) {
    const sessions = computeDoorOpenSessions(
      readings.map((r) => ({
        label: sensor.label,
        kind: "flood",
        value: r.value,
        recordedAt: r.recordedAt,
      })),
    );
    for (const session of sessions) {
      if (session.stillOpen) {
        floodOpen.push({ label: session.label, since: session.openedAt });
      } else if (session.closedAt) {
        recentFlood.push({ label: session.label, at: session.openedAt });
      }
    }
  }

  const levels: FloodLevelOverview["levels"] = [];
  for (const { sensor, samples } of levelBatches) {
    const last = samples.at(-1);
    if (!last) continue;
    levels.push({ label: sensor.label, value: last.tempF, at: last.at });
  }

  return {
    floodOpen,
    recentFlood: recentFlood.slice(-4).reverse(),
    levels,
  };
}

export async function loadEnergyOverview(
  devices: DeviceWithSensors[],
): Promise<EnergyOverview | null> {
  const energySensors = devices.flatMap((d) =>
    d.sensors.filter((s) => s.kind === "energy").map((s) => ({ label: s.label, id: s.id })),
  );
  if (energySensors.length === 0) return null;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const batches = await Promise.all(
    energySensors.map(async (sensor) => {
      const samples = await getRecentNumericReadingSamples(sensor.id, since);
      return { sensor, samples };
    }),
  );

  const best = batches
    .filter((b) => b.samples.length > 0)
    .sort((a, b) => b.samples.length - a.samples.length)[0];
  if (!best) return null;

  const values = best.samples.map((s) => s.tempF);
  const latest = best.samples[best.samples.length - 1]!;
  const avgW = values.reduce((sum, v) => sum + v, 0) / values.length;
  return {
    label: best.sensor.label,
    latestW: latest.tempF,
    at: latest.at,
    sampleCount: values.length,
    avgW,
  };
}
