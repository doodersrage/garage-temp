export type DemoControls = {
  outdoorF: number;
  sunIntensity: number;
  doorOpen: boolean;
};

export type DemoProbeReading = {
  f: number;
  c: number;
  h: number;
};

export type DemoProbe = {
  key: string;
  label: string;
  reading: DemoProbeReading;
};

export const defaultDemoControls: DemoControls = {
  outdoorF: 42,
  sunIntensity: 35,
  doorOpen: false,
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
  const garageBase = controls.outdoorF + 6;
  const sunBoost = controls.sunIntensity * 0.18;
  const doorMix = controls.doorOpen ? 0.55 : 0;

  const northF = round1(
    garageBase + sunBoost * 0.25 - doorMix * 4,
  );
  const doorF = round1(
    garageBase * (1 - doorMix) + controls.outdoorF * doorMix + sunBoost * 0.1,
  );
  const benchF = round1(
    garageBase + sunBoost * 0.85 - doorMix * 2,
  );

  const probes: DemoProbe[] = [
    {
      key: "0",
      label: "North wall",
      reading: {
        f: northF,
        c: round1(fahrenheitToCelsius(northF)),
        h: humidityForTemp(northF, controls.doorOpen, controls.sunIntensity),
      },
    },
    {
      key: "1",
      label: "Door zone",
      reading: {
        f: doorF,
        c: round1(fahrenheitToCelsius(doorF)),
        h: humidityForTemp(doorF, controls.doorOpen, controls.sunIntensity),
      },
    },
    {
      key: "2",
      label: "Workbench",
      reading: {
        f: benchF,
        c: round1(fahrenheitToCelsius(benchF)),
        h: humidityForTemp(benchF, controls.doorOpen, controls.sunIntensity),
      },
    },
  ];

  return probes;
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

export function buildDemoFeedJson(probes: DemoProbe[], average: DemoProbeReading): string {
  const temp: Record<string, DemoProbeReading> = {
    avg: average,
  };

  for (const probe of probes) {
    temp[probe.key] = probe.reading;
  }

  return JSON.stringify({ temp }, null, 2);
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
