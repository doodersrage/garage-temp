import { computeGarageRiskStatus, type GarageRiskStatus } from "./garageRiskStatus";

export type DemoSpaceKind = "garage" | "workshop" | "attic" | "crawlspace";

export type DemoControls = {
  outdoorF: number;
  sunIntensity: number;
  doorOpen: boolean;
  freezeThresholdF: number;
  space: DemoSpaceKind;
};

export type DemoProbeReading = {
  f: number;
  c: number;
  h: number;
};

export type DemoProbe = {
  key: string;
  label: string;
  /** Flat ingest / JSON key, e.g. north_wall */
  ingestKey: string;
  reading: DemoProbeReading;
};

export type DemoSpaceConfig = {
  id: DemoSpaceKind;
  label: string;
  /** How much warmer than outdoor the “interior” tends to sit when closed. */
  baseOffsetF: number;
  doorLabel: string;
  probes: Array<{ key: string; label: string; ingestKey: string }>;
};

export const DEMO_SPACES: Record<DemoSpaceKind, DemoSpaceConfig> = {
  garage: {
    id: "garage",
    label: "Garage",
    baseOffsetF: 6,
    doorLabel: "Bay door open (mixes outside air into the door zone)",
    probes: [
      { key: "0", label: "North wall", ingestKey: "north_wall" },
      { key: "1", label: "Door zone", ingestKey: "door_zone" },
      { key: "2", label: "Workbench", ingestKey: "workbench" },
    ],
  },
  workshop: {
    id: "workshop",
    label: "Workshop",
    baseOffsetF: 8,
    doorLabel: "Shop door open (mixes outside air into the entry zone)",
    probes: [
      { key: "0", label: "Exterior wall", ingestKey: "ext_wall" },
      { key: "1", label: "Entry zone", ingestKey: "entry" },
      { key: "2", label: "Tool bench", ingestKey: "tool_bench" },
    ],
  },
  attic: {
    id: "attic",
    label: "Attic",
    baseOffsetF: 4,
    doorLabel: "Hatch open (mixes conditioned air into the hatch zone)",
    probes: [
      { key: "0", label: "North rafter", ingestKey: "rafter_n" },
      { key: "1", label: "Hatch zone", ingestKey: "hatch" },
      { key: "2", label: "Ridge peak", ingestKey: "ridge" },
    ],
  },
  crawlspace: {
    id: "crawlspace",
    label: "Crawlspace",
    baseOffsetF: 3,
    doorLabel: "Access door open (mixes outside air near the entry)",
    probes: [
      { key: "0", label: "Foundation wall", ingestKey: "foundation" },
      { key: "1", label: "Access zone", ingestKey: "access" },
      { key: "2", label: "Pipe run", ingestKey: "pipe_run" },
    ],
  },
};

export const defaultDemoControls: DemoControls = {
  outdoorF: 42,
  sunIntensity: 35,
  doorOpen: false,
  freezeThresholdF: 34,
  space: "garage",
};

export type DemoPresetId = "mild" | "coldSnap" | "doorDraft" | "sunny";

export const DEMO_PRESETS: Record<
  DemoPresetId,
  { label: string; hint: string; controls: Partial<DemoControls> }
> = {
  mild: {
    label: "Mild day",
    hint: "Typical closed-space readings",
    controls: { outdoorF: 42, sunIntensity: 35, doorOpen: false, freezeThresholdF: 34 },
  },
  coldSnap: {
    label: "Cold snap",
    hint: "Below freeze threshold on the coldest probe",
    controls: { outdoorF: 18, sunIntensity: 0, doorOpen: false, freezeThresholdF: 34 },
  },
  doorDraft: {
    label: "Door draft",
    hint: "Open door pulls outdoor air into one zone",
    controls: { outdoorF: 28, sunIntensity: 10, doorOpen: true, freezeThresholdF: 34 },
  },
  sunny: {
    label: "Sun load",
    hint: "Roof / west exposure warms the hottest zone",
    controls: { outdoorF: 38, sunIntensity: 90, doorOpen: false, freezeThresholdF: 34 },
  },
};

export function fahrenheitToCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function humidityForTemp(tempF: number, doorOpen: boolean, sunIntensity: number): number {
  const base = 52 - (tempF - 40) * 0.35 + sunIntensity * 0.08;
  const doorEffect = doorOpen ? 9 : 0;
  return round1(clamp(base + doorEffect, 18, 92));
}

export function computeDemoProbes(controls: DemoControls): DemoProbe[] {
  const space = DEMO_SPACES[controls.space] ?? DEMO_SPACES.garage;
  const interiorBase = controls.outdoorF + space.baseOffsetF;
  const sunBoost = controls.sunIntensity * 0.18;
  const doorMix = controls.doorOpen ? 0.55 : 0;

  // Attics amplify sun; crawlspaces mute it.
  const sunScale =
    controls.space === "attic" ? 1.35 : controls.space === "crawlspace" ? 0.35 : 1;

  const zoneTemps = [
    round1(interiorBase + sunBoost * 0.25 * sunScale - doorMix * 4),
    round1(
      interiorBase * (1 - doorMix) + controls.outdoorF * doorMix + sunBoost * 0.1 * sunScale,
    ),
    round1(interiorBase + sunBoost * 0.85 * sunScale - doorMix * 2),
  ];

  return space.probes.map((meta, index) => {
    const f = zoneTemps[index] ?? zoneTemps[0]!;
    return {
      key: meta.key,
      label: meta.label,
      ingestKey: meta.ingestKey,
      reading: {
        f,
        c: round1(fahrenheitToCelsius(f)),
        h: humidityForTemp(f, controls.doorOpen, controls.sunIntensity),
      },
    };
  });
}

export function computeAverageReading(probes: DemoProbe[]): DemoProbeReading {
  const count = probes.length || 1;
  const f = round1(probes.reduce((sum, probe) => sum + probe.reading.f, 0) / count);
  const h = round1(probes.reduce((sum, probe) => sum + probe.reading.h, 0) / count);

  return {
    f,
    c: round1(fahrenheitToCelsius(f)),
    h,
  };
}

export function coldestProbeTempF(probes: DemoProbe[]): number | null {
  if (probes.length === 0) return null;
  return Math.min(...probes.map((probe) => probe.reading.f));
}

/** Pull-feed shape used by the example weather JSON and Devices → pull. */
export function buildDemoFeedJson(probes: DemoProbe[], average: DemoProbeReading): string {
  const temp: Record<string, DemoProbeReading> = {
    avg: average,
  };

  for (const probe of probes) {
    temp[probe.key] = probe.reading;
  }

  return JSON.stringify({ temp }, null, 2);
}

/** Flat push-ingest payload matching ESP/Arduino POST bodies. */
export function buildDemoIngestPayload(
  probes: DemoProbe[],
  average: DemoProbeReading,
): Record<string, number | boolean> {
  const payload: Record<string, number | boolean> = {
    avg: average.f,
  };
  for (const probe of probes) {
    payload[probe.ingestKey] = probe.reading.f;
    payload[`${probe.ingestKey}_h`] = probe.reading.h;
  }
  return payload;
}

export function buildDemoIngestJson(probes: DemoProbe[], average: DemoProbeReading): string {
  return JSON.stringify(buildDemoIngestPayload(probes, average), null, 2);
}

export function buildDemoSpaceStatus(
  probes: DemoProbe[],
  controls: DemoControls,
): GarageRiskStatus {
  const coldest = coldestProbeTempF(probes);
  return computeGarageRiskStatus({
    hasDevices: true,
    hasLiveReading: true,
    coldestProbeTempF: coldest,
    freezeThresholdF: controls.freezeThresholdF,
    staleSensorCount: 0,
    nightsRiskCount: controls.outdoorF <= controls.freezeThresholdF + 5 ? 1 : 0,
    alertsEnabled: true,
    hasEmailAlerts: true,
    outdoorTempF: controls.outdoorF,
    showColdSnapChecklist: controls.outdoorF <= 25,
  });
}

export function applyProbeNoise(probes: DemoProbe[]): {
  probes: DemoProbe[];
  average: DemoProbeReading;
} {
  const noisyProbes = probes.map((probe) => {
    const f = round1(probe.reading.f + (Math.random() - 0.5) * 0.6);
    const h = round1(
      clamp(probe.reading.h + (Math.random() - 0.5) * 1.2, 18, 92),
    );

    return {
      ...probe,
      reading: {
        f,
        c: round1(fahrenheitToCelsius(f)),
        h,
      },
    };
  });

  return {
    probes: noisyProbes,
    average: computeAverageReading(noisyProbes),
  };
}
