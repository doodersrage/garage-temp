import type { APIRoute } from "astro";
import { getAuthFromCookies } from "../../../lib/auth";
import { listHouseholdDevices, updateDeviceSensor } from "../../../lib/devices";
import { requireHouseholdEditor, householdEditorCtx } from "../../../lib/householdAuth";

export const POST: APIRoute = async ({ request, cookies }) => {
  const { user } = await getAuthFromCookies(cookies);
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const editor = await requireHouseholdEditor(user.id);
  if (!editor.ok) {
    return new Response(JSON.stringify({ ok: false, error: "View-only access." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = (await request.json()) as {
    sensors?: Array<{ id?: string; label?: string }>;
  };
  if (!Array.isArray(body.sensors) || body.sensors.length === 0) {
    return new Response(JSON.stringify({ ok: false, error: "No sensors provided." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { devices } = await listHouseholdDevices(householdEditorCtx(editor).householdId);
  const sensorById = new Map(
    devices.flatMap((device) =>
      device.sensors.map((sensor) => [sensor.id, { sensor, deviceId: device.id }] as const),
    ),
  );

  for (const row of body.sensors) {
    const id = row.id?.trim();
    const label = row.label?.trim();
    if (!id || !label) continue;
    const match = sensorById.get(id);
    if (!match) continue;
    const result = await updateDeviceSensor(id, match.deviceId, {
      key: match.sensor.key,
      label,
      kind: match.sensor.kind,
      unit: match.sensor.unit,
      offsetNum: match.sensor.offset_num,
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
