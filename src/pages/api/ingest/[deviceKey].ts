import type { APIRoute } from "astro";
import {
  findDeviceByIngestKeyHash,
  touchDeviceLastSeen,
  upsertDeviceSensor,
} from "../../../lib/devices";
import { insertSensorReadings } from "../../../lib/sensorReadings";
import {
  inferSensorKind,
  parseIngestPayload,
} from "../../../lib/ingestPayload";
import { parseTempFeedPayload } from "../../../lib/tempFeedConfig";
import {
  checkIngestRateLimit,
  readJsonBodyWithLimit,
} from "../../../lib/ingestLimits";

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const POST: APIRoute = async ({ params, request }) => {
  const deviceKey = params.deviceKey;
  if (!deviceKey) {
    return new Response(JSON.stringify({ error: "Missing device key" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const keyHash = await sha256Hex(deviceKey);
  const rate = checkIngestRateLimit(keyHash);
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: rate.error }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...(rate.retryAfterSec
          ? { "Retry-After": String(rate.retryAfterSec) }
          : {}),
      },
    });
  }

  const device = await findDeviceByIngestKeyHash(keyHash);

  if (!device) {
    return new Response(JSON.stringify({ error: "Invalid device key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await readJsonBodyWithLimit(request);
  if (!body.ok) {
    return new Response(JSON.stringify({ error: body.error }), {
      status: body.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = body.payload;
  const { tempProbes, typed } = parseIngestPayload(payload);
  const recordedAt = new Date().toISOString();
  const rows = [];

  // Classic Arduino temp JSON
  const classic =
    Object.keys(tempProbes).length > 0
      ? tempProbes
      : (() => {
          try {
            return parseTempFeedPayload(payload);
          } catch {
            return {};
          }
        })();

  for (const [key, reading] of Object.entries(classic)) {
    const temp = await upsertDeviceSensor(
      device.id,
      key,
      `Probe ${key}`,
      "temperature",
      "F",
    );
    const humidity = await upsertDeviceSensor(
      device.id,
      key,
      `Probe ${key} humidity`,
      "humidity",
      "%",
    );

    if (temp.sensor) {
      rows.push({
        sensor_id: temp.sensor.id,
        household_id: device.household_id,
        recorded_at: recordedAt,
        value_num: reading.f,
        meta: { tempc: reading.c, tempf: reading.f },
      });
    }
    if (humidity.sensor) {
      rows.push({
        sensor_id: humidity.sensor.id,
        household_id: device.household_id,
        recorded_at: recordedAt,
        value_num: reading.h,
        meta: { humidity: reading.h },
      });
    }
  }

  for (const item of typed) {
    const kind = inferSensorKind(item.key, item);
    const sensor = await upsertDeviceSensor(
      device.id,
      item.key,
      item.label ?? item.key,
      kind,
      item.unit ?? null,
    );
    if (!sensor.sensor) continue;

    rows.push({
      sensor_id: sensor.sensor.id,
      household_id: device.household_id,
      recorded_at: recordedAt,
      value_num: item.value ?? null,
      value_bool: item.bool ?? null,
      value_text: item.text ?? null,
      meta: {},
    });
  }

  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: "No sensor values found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error } = await insertSensorReadings(rows);
  if (error) {
    return new Response(JSON.stringify({ error }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  await touchDeviceLastSeen(device.id);

  return new Response(
    JSON.stringify({ ok: true, readings: rows.length }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};
