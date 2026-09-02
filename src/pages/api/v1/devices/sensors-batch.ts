import type { APIRoute } from "astro";
import { resolveApiKey } from "../../../../lib/apiKeys";
import { listHouseholdDevices, updateDeviceSensor } from "../../../../lib/devices";

export const POST: APIRoute = async ({ request }) => {
  const auth = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!auth) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const resolved = await resolveApiKey(auth);
  if (!resolved) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid API key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = (await request.json()) as {
    sensors?: Array<{ id?: string; label?: string; visible?: boolean }>;
  };
  if (!Array.isArray(body.sensors) || body.sensors.length === 0) {
    return new Response(JSON.stringify({ ok: false, error: "No sensors provided." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { devices } = await listHouseholdDevices(resolved.householdId);
  const sensorById = new Map(
    devices.flatMap((device) =>
      device.sensors.map((sensor) => [sensor.id, { sensor, deviceId: device.id }] as const),
    ),
  );

  for (const row of body.sensors) {
    const id = row.id?.trim();
    if (!id) continue;
    const match = sensorById.get(id);
    if (!match) continue;
    const label = row.label?.trim() ?? match.sensor.label;
    const result = await updateDeviceSensor(id, match.deviceId, {
      key: match.sensor.key,
      label,
      kind: match.sensor.kind,
      unit: match.sensor.unit,
      offsetNum: match.sensor.offset_num,
      visible: typeof row.visible === "boolean" ? row.visible : match.sensor.visible,
    });
    if (result.error) {
      return new Response(JSON.stringify({ ok: false, error: result.error }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
