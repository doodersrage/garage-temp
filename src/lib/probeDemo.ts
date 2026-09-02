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
  /** Multiplier on sun/heat load (attics run hotter; crawlspaces barely move). */
  sunScale: number;
  /** How hard an open door/hatch mixes outdoor air into zone index 1 (0–1). */
  doorMixStrength: number;
  doorLabel: string;
  /** Short note shown under the space selector — thermal model differs by space. */
  modelHint: string;
  probes: Array<{ key: string; label: string; ingestKey: string }>;
};

export const DEMO_SPACES: Record<DemoSpaceKind, DemoSpaceConfig> = {
  garage: {
    id: "garage",
    label: "Garage",
    baseOffsetF: 6,
    sunScale: 1,
    doorMixStrength: 0.88,
    doorLabel: "Bay door open (mixes outside air into the door zone)",
    modelHint:
      "Balanced model: sun warms the workbench side; an open bay door pulls the door zone toward outdoor air while the far wall stays buffered.",
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
    sunScale: 0.9,
    doorMixStrength: 0.82,
    doorLabel: "Shop door open (mixes outside air into the entry zone)",
    modelHint:
      "Slightly warmer closed baseline than a garage (tools/people heat). Entry zone takes the draft; the tool bench stays the warm pocket.",
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
    sunScale: 1.55,
    doorMixStrength: 0.7,
    doorLabel: "Hatch open (mixes conditioned air into the hatch zone)",
    modelHint:
      "Sun-sensitive: ridge and rafters swing hard with heat load. Hatch open mixes cooler house air into the hatch zone only.",
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
    sunScale: 0.22,
    doorMixStrength: 0.9,
    doorLabel: "Access door open (mixes outside air near the entry)",
    modelHint:
      "Sun-muted and cooler baseline. Access open dumps outdoor air onto the entry probe; pipe runs stay closer to ground temperature.",
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
    hint: "Open door pulls outdoor air into one zone — watch the door/entry bar drop vs the others",
    controls: { outdoorF: 22, sunIntensity: 15, doorOpen: true, freezeThresholdF: 34 },
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
  const sunBoost = controls.sunIntensity * 0.18 * space.sunScale;
  // Strong mix so the door/entry zone visibly tracks outdoor while other zones stay buffered.
  const doorMix = controls.doorOpen ? space.doorMixStrength : 0;
  // Closed-space microclimate: wall slightly cool, workbench/ridge warmer pocket.
  const wallBias = controls.space === "attic" ? 1 : controls.space === "crawlspace" ? -0.5 : 1.5;
  const warmBias = controls.space === "attic" ? 3.5 : controls.space === "crawlspace" ? 1 : 4.5;

  const wallF = round1(interiorBase + wallBias + sunBoost * 0.22 - doorMix * 1.2);
  const doorF = round1(
    interiorBase * (1 - doorMix) + controls.outdoorF * doorMix + sunBoost * 0.04,
  );
  const warmF = round1(interiorBase + warmBias + sunBoost * 0.95 - doorMix * 0.6);

  const zoneTemps = [wallF, doorF, warmF];

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

/** Door/entry vs warmest other zone — used for the “placement matters” callout. */
export function doorDraftSpreadF(probes: DemoProbe[]): number | null {
  if (probes.length < 2) return null;
  const door = probes.find((p) => p.key === "1");
  if (!door) return null;
  const others = probes.filter((p) => p.key !== "1");
  if (others.length === 0) return null;
  const warmestOther = Math.max(...others.map((p) => p.reading.f));
  return round1(warmestOther - door.reading.f);
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

/** Pull-feed shape: nested under `temp`, keyed by the same names shown on the probe cards. */
export function buildDemoFeedJson(probes: DemoProbe[], average: DemoProbeReading): string {
  const temp: Record<string, DemoProbeReading> = {
    avg: average,
  };

  for (const probe of probes) {
    temp[probe.ingestKey] = probe.reading;
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
