// fetch local weather data from OpenWeather API

const WEATHER_FETCH_TIMEOUT_MS = 5000;

export type WeatherSnapshot = {
  name: string;
  country: string | null;
  lat: number | null;
  lon: number | null;
  temp: number;
  humidity: number;
  feelsLike: number;
  windSpeed: number;
  windGust: number | null;
  cloudCover: number;
  description: string;
  source?: "openweather" | "ambient" | "weatherflow";
};

/** OpenStreetMap embed centered on coords with a marker. */
export function weatherMapEmbedUrl(lat: number, lon: number, delta = 0.12): string {
  const west = lon - delta;
  const south = lat - delta;
  const east = lon + delta;
  const north = lat + delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${west}%2C${south}%2C${east}%2C${north}&layer=mapnik&marker=${lat}%2C${lon}`;
}

export function weatherMapExternalUrl(lat: number, lon: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=11/${lat}/${lon}`;
}

function cleanEnv(value: unknown): string {
  return String(value ?? "").replace(/\r/g, "").trim();
}

/** Server-only OpenWeather key. */
export function getOpenWeatherApiKey(): string {
  return cleanEnv(import.meta.env.OPENWEATHER_API_KEY);
}

export function getDefaultWeatherCityId(): string {
  return cleanEnv(import.meta.env.OPENWEATHER_CITY_ID);
}

export function resolveWeatherCityId(cityId?: string | null): string {
  const trimmed = cleanEnv(cityId);
  if (trimmed && /^\d+$/.test(trimmed)) {
    return trimmed;
  }
  return getDefaultWeatherCityId();
}

export function normalizeWeatherPayload(raw: Record<string, any>): WeatherSnapshot | null {
  const temp = Number(raw?.main?.temp);
  if (!Number.isFinite(temp)) return null;

  const lat = Number(raw?.coord?.lat);
  const lon = Number(raw?.coord?.lon);

  return {
    name: typeof raw?.name === "string" ? raw.name : "Unknown",
    country: typeof raw?.sys?.country === "string" ? raw.sys.country : null,
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    temp,
    humidity: Number(raw?.main?.humidity) || 0,
    feelsLike: Number(raw?.main?.feels_like) || temp,
    windSpeed: Number(raw?.wind?.speed) || 0,
    windGust:
      raw?.wind?.gust != null && Number.isFinite(Number(raw.wind.gust))
        ? Number(raw.wind.gust)
        : null,
    cloudCover: Number(raw?.clouds?.all) || 0,
    description:
      typeof raw?.weather?.[0]?.description === "string"
        ? raw.weather[0].description
        : "—",
  };
}

export async function fetchWeather(cityId?: string | null): Promise<any | null> {
  const apiKey = getOpenWeatherApiKey();
  const city = resolveWeatherCityId(cityId);

  if (!apiKey) {
    console.error("OpenWeather API key is not configured");
    return null;
  }

  if (!city) {
    console.error("OpenWeather city ID is not configured");
    return null;
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?id=${city}&appid=${apiKey}&units=imperial`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(WEATHER_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`Weather request failed (${response.status})`);
      return null;
    }

    return await response.json();
  } catch (e) {
    console.error("Weather fetch error:", e);
    return null;
  }
}

export async function fetchWeatherSnapshot(
  cityId?: string | null,
): Promise<WeatherSnapshot | null> {
  const raw = await fetchWeather(cityId);
  if (!raw) return null;
  return normalizeWeatherPayload(raw);
}

export async function fetchWeatherForecastRaw(
  cityId?: string | null,
): Promise<any | null> {
  const apiKey = getOpenWeatherApiKey();
  const city = resolveWeatherCityId(cityId);

  if (!apiKey || !city) return null;

  const url = `https://api.openweathermap.org/data/2.5/forecast?id=${city}&appid=${apiKey}&units=imperial`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(WEATHER_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`Forecast request failed (${response.status})`);
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error("Forecast fetch error:", e);
    return null;
  }
}

export type ForecastWindow = {
  minTempF: number;
  cityName: string | null;
  hoursAhead: number;
};

/** Lowest forecast temp (°F) within the next `hoursAhead` hours (3h steps). */
export function minForecastTempInWindow(
  raw: Record<string, any> | null | undefined,
  hoursAhead: number,
  now = Date.now(),
): ForecastWindow | null {
  const list = raw?.list;
  if (!Array.isArray(list) || list.length === 0) return null;

  const cutoff = now + Math.max(1, hoursAhead) * 60 * 60 * 1000;
  let minTemp = Number.POSITIVE_INFINITY;

  for (const entry of list) {
    const ts = Number(entry?.dt) * 1000;
    if (!Number.isFinite(ts) || ts < now || ts > cutoff) continue;
    const temp = Number(entry?.main?.temp);
    if (Number.isFinite(temp) && temp < minTemp) {
      minTemp = temp;
    }
  }

  if (!Number.isFinite(minTemp)) return null;

  return {
    minTempF: minTemp,
    cityName: typeof raw?.city?.name === "string" ? raw.city.name : null,
    hoursAhead,
  };
}

export async function fetchForecastMinTemp(
  cityId?: string | null,
  hoursAhead = 24,
): Promise<ForecastWindow | null> {
  const raw = await fetchWeatherForecastRaw(cityId);
  return minForecastTempInWindow(raw, hoursAhead);
}

export async function fetchForecastMinTempByCoords(
  lat: number,
  lon: number,
  hoursAhead = 24,
): Promise<ForecastWindow | null> {
  const raw = await fetchWeatherForecastByCoords(lat, lon);
  return minForecastTempInWindow(raw, hoursAhead);
}

export async function fetchWeatherByCoords(
  lat: number,
  lon: number,
): Promise<any | null> {
  const apiKey = getOpenWeatherApiKey();
  if (!apiKey || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(WEATHER_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchWeatherForecastByCoords(
  lat: number,
  lon: number,
): Promise<any | null> {
  const apiKey = getOpenWeatherApiKey();
  if (!apiKey || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(WEATHER_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export type NightRisk = {
  dateLabel: string;
  minTempF: number;
  atRisk: boolean;
};

/** Overnight mins for the next few local nights from 3h forecast steps. */
export function nightsAtRiskFromForecast(
  raw: Record<string, any> | null | undefined,
  freezeThresholdF: number,
  nights = 5,
): NightRisk[] {
  const list = raw?.list;
  if (!Array.isArray(list)) return [];

  const byDay = new Map<string, number>();
  for (const entry of list) {
    const ts = Number(entry?.dt) * 1000;
    if (!Number.isFinite(ts)) continue;
    const d = new Date(ts);
    const hour = d.getUTCHours();
    // Treat 00–09 UTC buckets as overnight-ish for US; still useful as a proxy
    if (hour > 12) continue;
    const key = d.toISOString().slice(0, 10);
    const temp = Number(entry?.main?.temp);
    if (!Number.isFinite(temp)) continue;
    const prev = byDay.get(key);
    if (prev == null || temp < prev) byDay.set(key, temp);
  }

  return [...byDay.entries()]
    .slice(0, nights)
    .map(([date, minTempF]) => ({
      dateLabel: new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      minTempF,
      atRisk: minTempF <= freezeThresholdF,
    }));
}

export async function fetchNightsAtRisk(
  options: {
    cityId?: string | null;
    lat?: number | null;
    lon?: number | null;
    freezeThresholdF: number;
  },
): Promise<NightRisk[]> {
  let raw: any = null;
  if (options.lat != null && options.lon != null) {
    raw = await fetchWeatherForecastByCoords(options.lat, options.lon);
  } else {
    raw = await fetchWeatherForecastRaw(options.cityId);
  }
  return nightsAtRiskFromForecast(raw, options.freezeThresholdF);
}
