import type { APIRoute } from "astro";
import { createServerClient } from "../../../../lib/supabase";
import { fetchLatestSensorValues } from "../../../../lib/sensorReadings";
import { listHouseholdDevices } from "../../../../lib/devices";

async function resolveShare(token: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("share_links")
    .select("id, token, household_id, scope, label, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return null;
  if (data.expires_at && Date.parse(data.expires_at) < Date.now()) return null;
  return data;
}

export const GET: APIRoute = async ({ params }) => {
  const token = params.token;
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing token" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const share = await resolveShare(token);
  if (!share) {
    return new Response(JSON.stringify({ error: "Invalid or expired link" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const readings = await fetchLatestSensorValues(share.household_id);
  const devices = await listHouseholdDevices(share.household_id);

  return new Response(
    JSON.stringify({
      scope: share.scope,
      label: share.label,
      readings: readings.map((row) => ({
        device: row.deviceName,
        key: row.sensor.key,
        label: row.sensor.label,
        kind: row.sensor.kind,
        unit: row.sensor.unit,
        value_num: row.value_num,
        value_bool: row.value_bool,
        value_text: row.value_text,
        recorded_at: row.recorded_at,
      })),
      devices: devices.devices.map((d) => ({
        name: d.name,
        last_seen_at: d.last_seen_at,
        source: d.source,
      })),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};
