// fetch local weather data from OpenWeather API

export function getDefaultWeatherCityId(): string {
  return import.meta.env.NEXT_PUBLIC_OPENWEATHER_CITY_ID;
}

export function resolveWeatherCityId(cityId?: string | null): string {
  const trimmed = cityId?.trim();
  if (trimmed && /^\d+$/.test(trimmed)) {
    return trimmed;
  }
  return getDefaultWeatherCityId();
}

export async function fetchWeather(cityId?: string | null): Promise<any | null> {
  const apiKey = import.meta.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  const city = resolveWeatherCityId(cityId);

  if (!apiKey) {
    console.error("OpenWeather API key is not configured");
    return null;
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?id=${city}&appid=${apiKey}&units=imperial`;

  try {
    const response = await fetch(url);

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
