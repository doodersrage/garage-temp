import type { APIRoute } from "astro";
import {
  findDeviceByIngestKeyHash,
  touchDeviceLastSeen,
  updateDeviceMeta,
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
import { recordIngestStat } from "../../../lib/ingestStats";
import { appendBatterySample } from "../../../lib/batteryTrend";

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

  const finish = async (
    response: Response,
    success: boolean,
  ): Promise<Response> => {
    try {
      await recordIngestStat(device.id, success);
    } catch (statError) {
      console.error("Ingest stat failed:", statError);
    }
    return response;
  };

  const body = await readJsonBodyWithLimit(request);
  if (!body.ok) {
    return finish(
      new Response(JSON.stringify({ error: body.error }), {
        status: body.status,
        headers: { "Content-Type": "application/json" },
      }),
      false,
    );
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
    return finish(
      new Response(JSON.stringify({ error: "No sensor values found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
      false,
    );
  }

  const { error } = await insertSensorReadings(rows);
  if (error) {
    return finish(
      new Response(JSON.stringify({ error }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
      false,
    );
  }

  const metaPatch: Record<string, unknown> = {};
  const battery = Number(
    (payload as Record<string, unknown>).battery ??
      (payload as Record<string, unknown>).battery_pct,
  );
  const rssi = Number((payload as Record<string, unknown>).rssi);
  if (Number.isFinite(battery)) {
    metaPatch.battery_pct = battery;
    metaPatch.battery_history = appendBatterySample(
      device.meta?.battery_history,
      battery,
      recordedAt,
    );
  }
  if (Number.isFinite(rssi)) metaPatch.rssi = rssi;

  if (Object.keys(metaPatch).length > 0) {
    await updateDeviceMeta(device.id, metaPatch);
  } else {
    await touchDeviceLastSeen(device.id);
  }

  // Best-effort immediate alerts (cooldowns still apply)
  try {
    const { listHouseholdMembers } = await import("../../../lib/households");
    const { listHouseholdDevices } = await import("../../../lib/devices");
    const {
      getAlertSettingsForUser,
    } = await import("../../../lib/notify");
    const {
      sendThresholdAlertsIfNeeded,
      maybeSendRuleAlerts,
      buildAlertReadingsFromLatestSensors,
    } = await import("../../../lib/alertNotifications");
    const { fetchLatestSensorValues } = await import("../../../lib/sensorReadings");
    const { createAdminClient } = await import("../../../lib/supabase");

    const members = await listHouseholdMembers(device.household_id);
    const devices = await listHouseholdDevices(device.household_id);
    const latest = await fetchLatestSensorValues(device.household_id);
    const readings = buildAlertReadingsFromLatestSensors(latest);
    const admin = createAdminClient();

    for (const member of members.members) {
      const { data } = await admin.auth.admin.getUserById(member.user_id);
      const settings = await getAlertSettingsForUser(
        member.user_id,
        data.user?.user_metadata as Record<string, unknown> | undefined,
      );
      await sendThresholdAlertsIfNeeded(
        member.user_id,
        data.user?.email,
        settings,
        readings,
      );
      await maybeSendRuleAlerts(
        member.user_id,
        data.user?.email,
        devices.devices,
        settings,
        readings,
        device.household_id,
      );
    }
  } catch (alertError) {
    console.error("Ingest alert evaluation failed:", alertError);
  }

  return finish(
    new Response(
      JSON.stringify({ ok: true, readings: rows.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    ),
    true,
  );
};
