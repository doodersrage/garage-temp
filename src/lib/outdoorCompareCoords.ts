import type { User } from "@supabase/supabase-js";
import { fetchWeatherSnapshotForConfig, getPersonalWeatherConfig } from "./weatherContext";
import { createServerClient } from "./supabase";
import { getUserHouseholdId } from "./households";

export type OutdoorCompareCoords = {
  lat: number;
  lon: number;
  label: string;
};

async function freezeMapCoordsForHousehold(
  householdId: string,
): Promise<OutdoorCompareCoords | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("households")
    .select("freeze_map_lat, freeze_map_lon, freeze_map_label")
    .eq("id", householdId)
    .maybeSingle();

  if (error || !data) return null;

  const lat = data.freeze_map_lat;
  const lon = data.freeze_map_lon;
  if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const label = data.freeze_map_label?.trim() || "Freeze map location";
  return { lat, lon, label };
}

/** Lat/lon for outdoor YoY fallback: live weather source, then household freeze map. */
export async function resolveOutdoorCompareCoords(
  userId: string,
  user?: User | null,
): Promise<OutdoorCompareCoords | null> {
  if (user) {
    const snapshot = await fetchWeatherSnapshotForConfig(getPersonalWeatherConfig(user));
    if (snapshot?.lat != null && snapshot.lon != null) {
      return {
        lat: snapshot.lat,
        lon: snapshot.lon,
        label: snapshot.name?.trim() || "Weather location",
      };
    }
  }

  const householdId = await getUserHouseholdId(userId);
  if (!householdId) return null;

  return freezeMapCoordsForHousehold(householdId);
}
