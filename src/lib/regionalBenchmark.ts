import { createServerClient } from "./supabase";
import { freezeMapAggregateKey } from "./weatherCities";

export type RegionalBenchmark = {
  cityLabel: string;
  cityAvgTempF: number | null;
  yourTempF: number;
  deltaF: number | null;
  message: string;
};

/** Compare household coldest probe to opt-in regional freeze-map aggregate. */
export async function fetchRegionalBenchmark(input: {
  householdId: string;
  yourTempF: number;
}): Promise<RegionalBenchmark | null> {
  if (!Number.isFinite(input.yourTempF)) return null;

  const supabase = createServerClient();
  const { data: household } = await supabase
    .from("households")
    .select("freeze_map_city_id, freeze_map_label, freeze_map_opt_in")
    .eq("id", input.householdId)
    .maybeSingle();

  if (!household?.freeze_map_opt_in || !household.freeze_map_city_id) {
    return null;
  }

  const cityId = freezeMapAggregateKey({
    cityId: household.freeze_map_city_id,
    lat: null,
    lon: null,
  });
  if (!cityId) return null;

  const { data: snapshot } = await supabase
    .from("freeze_map_snapshots")
    .select("city_label, avg_temp_f, min_temp_f")
    .eq("city_id", cityId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!snapshot?.avg_temp_f && snapshot?.min_temp_f == null) {
    return null;
  }

  const cityAvg = snapshot.avg_temp_f ?? snapshot.min_temp_f;
  if (cityAvg == null || !Number.isFinite(cityAvg)) return null;

  const deltaF = input.yourTempF - cityAvg;
  const cityLabel = snapshot.city_label ?? household.freeze_map_label ?? "your region";
  const abs = Math.abs(deltaF).toFixed(1);

  let message: string;
  if (Math.abs(deltaF) < 1.5) {
    message = `About typical for other ThermalTrace garages in ${cityLabel} tonight.`;
  } else if (deltaF < 0) {
    message = `${abs}°F colder than typical ThermalTrace garages in ${cityLabel} right now.`;
  } else {
    message = `${abs}°F warmer than typical ThermalTrace garages in ${cityLabel} right now.`;
  }

  return {
    cityLabel,
    cityAvgTempF: cityAvg,
    yourTempF: input.yourTempF,
    deltaF,
    message,
  };
}

export function formatBenchmarkAlertSuffix(benchmark: RegionalBenchmark | null): string | null {
  return benchmark?.message ?? null;
}
