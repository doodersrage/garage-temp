/** Sample POST body helpers for the Devices “waiting for first POST” panel. */

export type WaitingSensorHint = {
  key: string;
  kind: string;
};

export function sampleValueForKind(kind: string): number | boolean | string {
  switch (kind) {
    case "door":
    case "flood":
    case "motion":
    case "power":
      return true;
    case "humidity":
      return 38;
    case "battery":
      return 87;
    case "co2":
      return 650;
    case "pressure":
      return 1013;
    case "pm25":
      return 12;
    case "voc":
      return 120;
    case "energy":
      return 1.2;
    case "water_level":
      return 4;
    case "temperature":
    default:
      return 42.5;
  }
}

export function buildWaitingIngestPayload(
  sensors: WaitingSensorHint[],
): Record<string, number | boolean | string> {
  const payload: Record<string, number | boolean | string> = {};
  for (const sensor of sensors) {
    const key = sensor.key.trim();
    if (!key || key in payload) continue;
    payload[key] = sampleValueForKind(sensor.kind);
  }
  return payload;
}

export function buildWaitingIngestCurl(
  origin: string,
  sensors: WaitingSensorHint[],
  keyPlaceholder = "YOUR_KEY",
): string {
  const payload = buildWaitingIngestPayload(sensors);
  const body = JSON.stringify(payload);
  const base = origin.replace(/\/+$/, "");
  return `curl -X POST "${base}/api/ingest/${keyPlaceholder}" \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'`;
}

export function buildEspHomeHttpRequestSnippet(
  ingestUrl: string,
  sensors: WaitingSensorHint[] = [{ key: "temp1", kind: "temperature" }],
): string {
  const payload = buildWaitingIngestPayload(sensors);
  const body = JSON.stringify(payload);
  return `http_request.post:
  url: ${ingestUrl}
  headers:
    Content-Type: application/json
  body: '${body}'`;
}

export function buildArduinoHttpClientSnippet(
  ingestUrl: string,
  sensors: WaitingSensorHint[] = [{ key: "temp1", kind: "temperature" }],
): string {
  const payload = buildWaitingIngestPayload(sensors);
  const body = JSON.stringify(payload).replace(/"/g, '\\"');
  return `// After WiFiClientSecure client is connected:
client.println("POST /api/ingest/YOUR_KEY HTTP/1.1");
client.println("Host: thermaltrace.dev");
client.println("Content-Type: application/json");
client.print("Content-Length: ");
client.println(strlen("${body}"));
client.println();
client.print("${body}");
// Prefer the full URL: ${ingestUrl}`;
}
