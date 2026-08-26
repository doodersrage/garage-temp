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

function prometheusMetricName(device: string, key: string, kind: string): string {
  const base = `garage_${kind}_${device}_${key}`
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "garage_sensor";
}

export const GET: APIRoute = async ({ params, request, url }) => {
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

  const format =
    url.searchParams.get("format") ??
    (request.headers.get("accept")?.includes("text/plain")
      ? "prometheus"
      : share.scope === "metrics"
        ? "prometheus"
        : "json");

  if (format === "prometheus" || share.scope === "metrics") {
    const lines: string[] = [
      "# HELP garage_sensor_value Latest numeric garage sensor reading",
      "# TYPE garage_sensor_value gauge",
    ];
    for (const row of readings) {
      if (row.value_num == null) continue;
      const name = prometheusMetricName(
        row.deviceName,
        row.sensor.key,
        row.sensor.kind,
      );
      const labels = `device="${row.deviceName.replace(/"/g, "")}",key="${row.sensor.key}",kind="${row.sensor.kind}"`;
      const ts = Date.parse(row.recorded_at);
      lines.push(
        `${name}{${labels}} ${row.value_num}${Number.isFinite(ts) ? ` ${ts}` : ""}`,
      );
    }
    return new Response(lines.join("\n") + "\n", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  if (format === "grafana") {
    const series = readings
      .filter((row) => row.value_num != null)
      .map((row) => ({
        target: `${row.deviceName}/${row.sensor.label}`,
        datapoints: [
          [row.value_num as number, Date.parse(row.recorded_at) || Date.now()],
        ],
      }));
    return new Response(JSON.stringify(series), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  return new Response(
    JSON.stringify({
      scope: share.scope,
      label: share.label,
      expires_at: share.expires_at,
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
      metrics_urls: {
        prometheus: `/api/share/${token}/readings?format=prometheus`,
        grafana: `/api/share/${token}/readings?format=grafana`,
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};
