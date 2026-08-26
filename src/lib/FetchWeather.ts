// fetch local weather data from OpenWeather API

const WEATHER_FETCH_TIMEOUT_MS = 5000;

export type WeatherSnapshot = {
  name: string;
  country: string | null;
  temp: number;
  humidity: number;
  feelsLike: number;
  windSpeed: number;
  windGust: number | null;
  cloudCover: number;
  description: string;
};

function cleanEnv(value: unknown): string {
  return String(value ?? "").replace(/\r/g, "").trim();
}

export function getDefaultWeatherCityId(): string {
  return cleanEnv(import.meta.env.NEXT_PUBLIC_OPENWEATHER_CITY_ID);
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

  return {
    name: typeof raw?.name === "string" ? raw.name : "Unknown",
    country: typeof raw?.sys?.country === "string" ? raw.sys.country : null,
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
  const apiKey = cleanEnv(import.meta.env.NEXT_PUBLIC_OPENWEATHER_API_KEY);
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
