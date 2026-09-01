import { getRuntimeEnv } from "./runtimeEnv";
import type { WeatherSnapshot } from "./FetchWeather";

export type WeatherSource = "openweather" | "ambient" | "weatherflow";

export type PersonalWeatherConfig = {
  source: WeatherSource;
  openWeatherCityId: string | null;
  ambientMac: string | null;
  ambientApiKey: string | null;
  weatherflowStationId: string | null;
  weatherflowToken: string | null;
};

const WEATHER_FETCH_TIMEOUT_MS = 5000;
const MAC_PATTERN = /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i;

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

export function normalizeAmbientMac(raw: string | null | undefined): string | null {
  const mac = clean(raw).toUpperCase();
  return MAC_PATTERN.test(mac) ? mac : null;
}

export function normalizeWeatherflowStationId(
  raw: string | null | undefined,
): string | null {
  const id = clean(raw);
  return /^\d+$/.test(id) ? id : null;
}

export function personalWeatherConfigFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  openWeatherCityId: string | null,
): PersonalWeatherConfig {
  const sourceRaw = clean(metadata?.weather_source).toLowerCase();
  const source: WeatherSource =
    sourceRaw === "ambient" || sourceRaw === "weatherflow" ? sourceRaw : "openweather";

  return {
    source,
    openWeatherCityId,
    ambientMac: normalizeAmbientMac(
      typeof metadata?.ambient_weather_mac === "string"
        ? metadata.ambient_weather_mac
        : null,
    ),
    ambientApiKey:
      typeof metadata?.ambient_weather_api_key === "string"
        ? clean(metadata.ambient_weather_api_key) || null
        : null,
    weatherflowStationId: normalizeWeatherflowStationId(
      typeof metadata?.weatherflow_station_id === "string"
        ? metadata.weatherflow_station_id
        : typeof metadata?.weatherflow_station_id === "number"
          ? String(metadata.weatherflow_station_id)
          : null,
    ),
    weatherflowToken:
      typeof metadata?.weatherflow_token === "string"
        ? clean(metadata.weatherflow_token) || null
        : null,
  };
}

export function personalWeatherMetadataPatch(
  config: PersonalWeatherConfig,
): Record<string, string | null> {
  return {
    weather_source: config.source,
    ambient_weather_mac: config.ambientMac,
    ambient_weather_api_key: config.ambientApiKey,
    weatherflow_station_id: config.weatherflowStationId,
    weatherflow_token: config.weatherflowToken,
  };
}

export function isWeatherLocationConfigured(config: PersonalWeatherConfig): boolean {
  if (config.source === "ambient") {
    return Boolean(config.ambientMac && config.ambientApiKey);
  }
  if (config.source === "weatherflow") {
    return Boolean(config.weatherflowStationId && config.weatherflowToken);
  }
  return Boolean(config.openWeatherCityId?.trim());
}

export async function fetchAmbientWeatherSnapshot(
  mac: string,
  userApiKey: string,
  applicationKey = getRuntimeEnv("AMBIENT_APPLICATION_KEY"),
): Promise<WeatherSnapshot | null> {
  if (!applicationKey || !userApiKey || !mac) return null;

  const url = new URL(`https://rt.ambientweather.net/v1/devices/${encodeURIComponent(mac)}`);
  url.searchParams.set("applicationKey", applicationKey);
  url.searchParams.set("apiKey", userApiKey);

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(WEATHER_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const rows = (await response.json()) as Array<Record<string, unknown>>;
    const row = rows?.[0];
    if (!row) return null;

    const last = row.lastData as Record<string, unknown> | undefined;
    const info = row.info as Record<string, unknown> | undefined;
    const coords = info?.coords as Record<string, unknown> | undefined;
    const temp = Number(last?.tempf);
    if (!Number.isFinite(temp)) return null;

    const lat = Number(coords?.lat);
    const lon = Number(coords?.lon);
    const name =
      typeof info?.name === "string"
        ? info.name
        : typeof row.name === "string"
          ? row.name
          : "Ambient station";

    return {
      name,
      country: null,
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
      temp,
      humidity: Number(last?.humidity) || 0,
      feelsLike: Number(last?.feelsLike) || temp,
      windSpeed: Number(last?.windspeedmph) || 0,
      windGust:
        last?.windgustmph != null && Number.isFinite(Number(last.windgustmph))
          ? Number(last.windgustmph)
          : null,
      cloudCover: 0,
      description: "Ambient Weather station",
      source: "ambient",
    };
  } catch {
    return null;
  }
}

export async function fetchWeatherFlowSnapshot(
  stationId: string,
  token: string,
): Promise<WeatherSnapshot | null> {
  if (!stationId || !token) return null;

  const url = new URL(
    `https://swd.weatherflow.com/swd/rest/observations/station/${encodeURIComponent(stationId)}`,
  );
  url.searchParams.set("token", token);

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(WEATHER_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const raw = (await response.json()) as Record<string, unknown>;
    const obs = Array.isArray(raw.obs) ? (raw.obs[0] as Record<string, unknown>) : null;
    if (!obs) return null;

    const units = raw.station_units as Record<string, unknown> | undefined;
    const tempUnits = clean(units?.units_temp).toLowerCase();
    let temp = Number(obs.air_temperature);
    if (!Number.isFinite(temp)) return null;
    if (tempUnits === "c") {
      temp = (temp * 9) / 5 + 32;
    }

    const station = raw.station as Record<string, unknown> | undefined;
    const lat = Number(station?.latitude);
    const lon = Number(station?.longitude);
    const name =
      typeof station?.station_name === "string" ? station.station_name : "WeatherFlow station";

    const windMs = Number(obs.wind_avg);
    const windMph = Number.isFinite(windMs) ? windMs * 2.23694 : 0;
    const gustMs = Number(obs.wind_gust);
    const gustMph = Number.isFinite(gustMs) ? gustMs * 2.23694 : null;

    return {
      name,
      country: null,
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
      temp,
      humidity: Number(obs.relative_humidity) || 0,
      feelsLike: temp,
      windSpeed: windMph,
      windGust: gustMph,
      cloudCover: 0,
      description: "WeatherFlow Tempest",
      source: "weatherflow",
    };
  } catch {
    return null;
  }
}
