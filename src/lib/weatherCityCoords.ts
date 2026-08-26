/** OpenWeather city id → approximate coordinates for freeze-map pins. */
export const WEATHER_CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  "5128581": { lat: 40.7128, lon: -74.006 },
  "5368361": { lat: 34.0522, lon: -118.2437 },
  "4887398": { lat: 41.8781, lon: -87.6298 },
  "4699066": { lat: 29.7604, lon: -95.3698 },
  "5308655": { lat: 33.4484, lon: -112.074 },
  "4560349": { lat: 39.9526, lon: -75.1652 },
  "5746545": { lat: 45.5152, lon: -122.6784 },
  "5809844": { lat: 47.6062, lon: -122.3321 },
  "4164138": { lat: 25.7617, lon: -80.1918 },
  "4930956": { lat: 42.3601, lon: -71.0589 },
  "4644585": { lat: 36.1627, lon: -86.7816 },
  "4460243": { lat: 35.2271, lon: -80.8431 },
  "5391959": { lat: 32.7157, lon: -117.1611 },
  "4671654": { lat: 32.7767, lon: -96.797 },
  "5375480": { lat: 37.3382, lon: -121.8863 },
  "4140963": { lat: 38.9072, lon: -77.0369 },
  "4990729": { lat: 42.3314, lon: -83.0458 },
  "5506956": { lat: 36.1699, lon: -115.1398 },
  "5419384": { lat: 38.8339, lon: -104.8214 },
  "4393217": { lat: 39.0997, lon: -94.5786 },
  "5879400": { lat: 61.2181, lon: -149.9003 },
  "5856195": { lat: 21.3069, lon: -157.8583 },
};

export function getWeatherPresetCoords(
  cityId: string | null | undefined,
): { lat: number; lon: number } | null {
  if (!cityId || !/^\d+$/.test(cityId)) return null;
  return WEATHER_CITY_COORDS[cityId] ?? null;
}
