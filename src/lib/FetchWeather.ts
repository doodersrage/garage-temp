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

export async function fetchWeather(cityId?: string | null): Promise<any> {
  const apiKey = import.meta.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  const city = resolveWeatherCityId(cityId);
  const url = `https://api.openweathermap.org/data/2.5/weather?id=${city}&appid=${apiKey}&units=imperial`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Weather data not found");
    }

    return await response.json();
  } catch (e) {
    console.error("Global error caught:", e);
    throw e;
  }
}
