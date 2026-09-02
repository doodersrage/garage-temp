import type { WeatherSnapshot } from "./FetchWeather";
import { fetchWeatherSnapshot, resolveWeatherCityId } from "./FetchWeather";
import {
  applyProbeNoise,
  computeAverageReading,
  computeDemoProbes,
  defaultDemoControls,
  type DemoControls,
} from "./probeDemo";
import type { TempReading } from "./tempFeedConfig";

export type ExampleFeedFormat = "pull" | "ingest" | "document";

export type WeatherSimulatedFeedOptions = {
  cityId?: string | null;
  /** Override door-open simulation (omit for time-based demo pattern). */
  doorOpen?: boolean;
  /** Override sun load 0–100 (omit to derive from weather + time of day). */
  sunIntensity?: number;
  /** Add small per-request noise (default true). */
  noisy?: boolean;
  now?: Date;
};

export type WeatherSimulatedFeedMeta = {
  generated_at: string;
  weather_source: "openweather" | "fallback";
  weather_city_id: string | null;
  outdoor_temp_f: number;
  outdoor_description: string | null;
  sun_intensity: number;
  door_open: boolean;
  simulated: true;
};

export type WeatherSimulatedPullPayload = {
  temp: Record<string, TempReading>;
  battery_pct: number;
  rssi: number;
};

export type WeatherSimulatedIngestPayload = WeatherSimulatedPullPayload & {
  sensors: Array<{
    key: string;
    kind: string;
    label: string;
    value?: number;
    bool?: boolean;
    unit?: string;
  }>;
};

export type WeatherSimulatedDocumentPayload = {
  pull: WeatherSimulatedPullPayload;
  ingest: WeatherSimulatedIngestPayload;
  meta: WeatherSimulatedFeedMeta;
  probe_labels: Record<string, string>;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Daylight curve peaking near solar noon; scaled by clear-sky fraction from cloud cover. */
export function deriveSunIntensity(
  weather: Pick<WeatherSnapshot, "cloudCover">,
  now: Date,
): number {
  const hour = now.getHours() + now.getMinutes() / 60;
  const daylight = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
  const clear = (100 - clamp(weather.cloudCover, 0, 100)) / 100;
  return Math.round(clamp(daylight * clear * 100, 0, 100));
}

/** Brief door-open windows for demo variety (~10% of each half-hour). */
export function deriveDoorOpen(now: Date, override?: boolean): boolean {
  if (override != null) return override;
  const minute = now.getMinutes();
  return minute % 30 >= 0 && minute % 30 < 3;
}

function stableDeviceMeta(now: Date): { battery_pct: number; rssi: number } {
  const hour = now.getUTCHours();
  const battery_pct = clamp(96 - hour * 0.35, 72, 96);
  const rssi = -58 - (hour % 6);
  return { battery_pct: round1(battery_pct), rssi };
}

function probesToTempRecord(
  probes: ReturnType<typeof computeDemoProbes>,
  average: TempReading,
): Record<string, TempReading> {
  const temp: Record<string, TempReading> = { avg: average };
  for (const probe of probes) {
    temp[probe.key] = {
      f: probe.reading.f,
      c: probe.reading.c,
      h: probe.reading.h,
    };
  }
  return temp;
}

export function buildWeatherSimulatedFeed(input: {
  weather: Pick<WeatherSnapshot, "temp" | "description" | "cloudCover">;
  controls: DemoControls;
  noisy?: boolean;
  now?: Date;
}): {
  pull: WeatherSimulatedPullPayload;
  ingest: WeatherSimulatedIngestPayload;
  probeLabels: Record<string, string>;
} {
  const now = input.now ?? new Date();
  const baseProbes = computeDemoProbes(input.controls);
  const { probes, average } =
    input.noisy === false
      ? { probes: baseProbes, average: computeAverageReading(baseProbes) }
      : applyProbeNoise(baseProbes);

  const temp = probesToTempRecord(probes, average);
  const { battery_pct, rssi } = stableDeviceMeta(now);

  const probeLabels = Object.fromEntries(probes.map((p) => [p.key, p.label]));

  const pull: WeatherSimulatedPullPayload = {
    temp,
    battery_pct,
    rssi,
  };

  const doorProbe = probes.find((p) => p.key === "1");
  const ingest: WeatherSimulatedIngestPayload = {
    ...pull,
    sensors: [
      {
        key: "shop_door",
        kind: "door",
        label: "Shop door",
        bool: input.controls.doorOpen,
      },
      ...probes.map((probe) => ({
        key: `probe_${probe.key}`,
        kind: "temperature",
        label: probe.label,
        value: probe.reading.f,
        unit: "F",
      })),
      {
        key: "door_zone",
        kind: "temperature",
        label: doorProbe?.label ?? "Door zone",
        value: doorProbe?.reading.f ?? average.f,
        unit: "F",
      },
    ],
  };

  return { pull, ingest, probeLabels };
}

export async function fetchWeatherSimulatedFeed(
  options: WeatherSimulatedFeedOptions = {},
): Promise<{
  pull: WeatherSimulatedPullPayload;
  ingest: WeatherSimulatedIngestPayload;
  meta: WeatherSimulatedFeedMeta;
  probeLabels: Record<string, string>;
}> {
  const now = options.now ?? new Date();
  const cityId = resolveWeatherCityId(options.cityId);
  const weather = await fetchWeatherSnapshot(cityId);

  const outdoorF = weather?.temp ?? defaultDemoControls.outdoorF;
  const sunIntensity =
    options.sunIntensity ??
    (weather
      ? deriveSunIntensity(weather, now)
      : defaultDemoControls.sunIntensity);
  const doorOpen = deriveDoorOpen(now, options.doorOpen);

  const controls: DemoControls = {
    outdoorF: round1(outdoorF),
    sunIntensity: clamp(sunIntensity, 0, 100),
    doorOpen,
  };

  const built = buildWeatherSimulatedFeed({
    weather: weather ?? {
      temp: outdoorF,
      description: "fallback",
      cloudCover: 40,
    },
    controls,
    noisy: options.noisy,
    now,
  });

  const meta: WeatherSimulatedFeedMeta = {
    generated_at: now.toISOString(),
    weather_source: weather ? "openweather" : "fallback",
    weather_city_id: cityId || null,
    outdoor_temp_f: controls.outdoorF,
    outdoor_description: weather?.description ?? null,
    sun_intensity: controls.sunIntensity,
    door_open: controls.doorOpen,
    simulated: true,
  };

  return {
    ...built,
    meta,
  };
}

export function formatExampleFeedResponse(
  format: ExampleFeedFormat,
  payload: Awaited<ReturnType<typeof fetchWeatherSimulatedFeed>>,
  feedUrl: string,
): Record<string, unknown> {
  if (format === "pull") {
    return payload.pull as unknown as Record<string, unknown>;
  }
  if (format === "ingest") {
    return payload.ingest as unknown as Record<string, unknown>;
  }
  return {
    feed_url: feedUrl,
    pull_url: feedUrl,
    ingest_sample_url: `${feedUrl}?format=ingest`,
    pull: payload.pull,
    ingest: payload.ingest,
    meta: payload.meta,
    probe_labels: payload.probeLabels,
    usage: {
      pull:
        "Dashboard → Devices → Edit pull feeds → paste feed_url, JSON root temp, map probe keys 0/1/2/avg.",
      push:
        "POST the ingest object to /api/ingest/<your-device-key> (classic temp object works; sensors[] is optional).",
    },
  };
}
