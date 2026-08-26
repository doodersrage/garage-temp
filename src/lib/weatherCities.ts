/** Common OpenWeatherMap city IDs for weather location presets. */
export const WEATHER_CITY_PRESETS: { id: string; label: string }[] = [
  { id: "5128581", label: "New York, NY" },
  { id: "5368361", label: "Los Angeles, CA" },
  { id: "4887398", label: "Chicago, IL" },
  { id: "4699066", label: "Houston, TX" },
  { id: "5308655", label: "Phoenix, AZ" },
  { id: "4560349", label: "Philadelphia, PA" },
  { id: "4726206", label: "San Antonio, TX" },
  { id: "5391959", label: "San Diego, CA" },
  { id: "4671654", label: "Dallas, TX" },
  { id: "5375480", label: "San Jose, CA" },
  { id: "4164138", label: "Miami, FL" },
  { id: "5746545", label: "Portland, OR" },
  { id: "5809844", label: "Seattle, WA" },
  { id: "4180439", label: "Atlanta, GA" },
  { id: "4930956", label: "Boston, MA" },
  { id: "4509177", label: "Columbus, OH" },
  { id: "4259418", label: "Indianapolis, IN" },
  { id: "5037649", label: "Minneapolis, MN" },
  { id: "5520993", label: "Denver, CO" },
  { id: "4182963", label: "Augusta, GA" },
];

export function getWeatherPresetLabel(cityId: string | null | undefined): string | null {
  if (!cityId) return null;
  return WEATHER_CITY_PRESETS.find((p) => p.id === cityId)?.label ?? null;
}
