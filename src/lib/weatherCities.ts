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
  { id: "4644585", label: "Nashville, TN" },
  { id: "4460243", label: "Charlotte, NC" },
  { id: "5206379", label: "Pittsburgh, PA" },
  { id: "4393217", label: "Kansas City, MO" },
  { id: "5780993", label: "Salt Lake City, UT" },
  { id: "4487042", label: "Raleigh, NC" },
  { id: "4781708", label: "Richmond, VA" },
  { id: "5110629", label: "Buffalo, NY" },
  { id: "4544349", label: "Oklahoma City, OK" },
  { id: "4407066", label: "St. Louis, MO" },
  { id: "4508722", label: "Cincinnati, OH" },
  { id: "5150529", label: "Cleveland, OH" },
  { id: "4990729", label: "Detroit, MI" },
  { id: "4887451", label: "Milwaukee, WI" },
  { id: "5879400", label: "Anchorage, AK" },
  { id: "5856195", label: "Honolulu, HI" },
  { id: "5317058", label: "Tucson, AZ" },
  { id: "5304391", label: "Mesa, AZ" },
  { id: "4167147", label: "Orlando, FL" },
  { id: "4174757", label: "Tampa, FL" },
  { id: "4160021", label: "Jacksonville, FL" },
  { id: "4691930", label: "Austin, TX" },
  { id: "4684888", label: "Fort Worth, TX" },
  { id: "4737316", label: "El Paso, TX" },
  { id: "5419384", label: "Colorado Springs, CO" },
  { id: "5506956", label: "Las Vegas, NV" },
  { id: "5389489", label: "Sacramento, CA" },
  { id: "5392171", label: "San Francisco, CA" },
  { id: "5327684", label: "Oakland, CA" },
  { id: "5340948", label: "Fresno, CA" },
  { id: "5357527", label: "Long Beach, CA" },
  { id: "5393015", label: "Santa Ana, CA" },
  { id: "5318313", label: "Albuquerque, NM" },
  { id: "5786882", label: "Boise, ID" },
  { id: "5746545", label: "Portland, OR" },
  { id: "5815135", label: "Spokane, WA" },
  { id: "5744337", label: "Eugene, OR" },
  { id: "4896861", label: "Madison, WI" },
  { id: "4862034", label: "Des Moines, IA" },
  { id: "5074472", label: "Omaha, NE" },
  { id: "4273837", label: "Wichita, KS" },
  { id: "4548393", label: "Tulsa, OK" },
  { id: "4119403", label: "Little Rock, AR" },
  { id: "4641239", label: "Memphis, TN" },
  { id: "4613588", label: "Knoxville, TN" },
  { id: "4233367", label: "Louisville, KY" },
  { id: "4502106", label: "Lexington, KY" },
  { id: "4829764", label: "Birmingham, AL" },
  { id: "4431410", label: "New Orleans, LA" },
  { id: "4335045", label: "Baton Rouge, LA" },
  { id: "4429295", label: "Jackson, MS" },
  { id: "4409896", label: "Springfield, MO" },
  { id: "4885197", label: "Rockford, IL" },
  { id: "4926563", label: "Fort Wayne, IN" },
  { id: "5174035", label: "Toledo, OH" },
  { id: "4502267", label: "Akron, OH" },
  { id: "5175861", label: "Youngstown, OH" },
  { id: "5123087", label: "Rochester, NY" },
  { id: "5123816", label: "Syracuse, NY" },
  { id: "5106834", label: "Newark, NJ" },
  { id: "4503954", label: "Jersey City, NJ" },
  { id: "4560349", label: "Philadelphia, PA" },
  { id: "5213682", label: "Harrisburg, PA" },
  { id: "4379947", label: "Baltimore, MD" },
  { id: "4140963", label: "Washington, DC" },
  { id: "4791259", label: "Virginia Beach, VA" },
  { id: "4752031", label: "Norfolk, VA" },
  { id: "4482121", label: "Greensboro, NC" },
  { id: "4490381", label: "Winston-Salem, NC" },
  { id: "4574324", label: "Charleston, SC" },
  { id: "4580543", label: "Columbia, SC" },
  { id: "4190598", label: "Savannah, GA" },
  { id: "4172131", label: "Tallahassee, FL" },
  { id: "4167695", label: "Pensacola, FL" },
  { id: "4683416", label: "Corpus Christi, TX" },
  { id: "4694482", label: "Lubbock, TX" },
  { id: "4671654", label: "Dallas, TX" },
  { id: "5416655", label: "Boulder, CO" },
  { id: "5780026", label: "Provo, UT" },
  { id: "5780993", label: "Salt Lake City, UT" },
  { id: "5788054", label: "Reno, NV" },
  { id: "5308655", label: "Phoenix, AZ" },
  { id: "5301388", label: "Flagstaff, AZ" },
];

/** Deduped presets by id (keeps first label). */
export function uniqueWeatherCityPresets(): { id: string; label: string }[] {
  const seen = new Set<string>();
  const out: { id: string; label: string }[] = [];
  for (const city of WEATHER_CITY_PRESETS) {
    if (seen.has(city.id)) continue;
    seen.add(city.id);
    out.push(city);
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

export function getWeatherPresetLabel(cityId: string | null | undefined): string | null {
  if (!cityId) return null;
  return WEATHER_CITY_PRESETS.find((p) => p.id === cityId)?.label ?? null;
}

export type GeocodeResult = {
  name: string;
  state: string | null;
  country: string;
  lat: number;
  lon: number;
  label: string;
};

export function normalizeGeocodeResults(raw: unknown): GeocodeResult[] {
  if (!Array.isArray(raw)) return [];
  const results: GeocodeResult[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const lat = Number(row.lat);
    const lon = Number(row.lon);
    const name = typeof row.name === "string" ? row.name : null;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const state = typeof row.state === "string" ? row.state : null;
    const country = typeof row.country === "string" ? row.country : "";
    const label = [name, state, country].filter(Boolean).join(", ");
    results.push({ name, state, country, lat, lon, label });
  }
  return results;
}

export function freezeMapAggregateKey(input: {
  cityId?: string | null;
  lat?: number | null;
  lon?: number | null;
}): string | null {
  if (input.cityId && /^\d+$/.test(input.cityId)) return input.cityId;
  if (
    input.lat != null &&
    input.lon != null &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lon)
  ) {
    return `geo:${input.lat.toFixed(2)},${input.lon.toFixed(2)}`;
  }
  return null;
}
