/**
 * Personalized ESP32 firmware helpers for the Devices ingest callout.
 * WiFi stays as placeholders; INGEST_URL is filled from the user’s device key.
 */

import {
  buildWaitingIngestPayload,
  type WaitingSensorHint,
} from "./waitingIngest";

export function parseIngestUrlParts(ingestUrl: string): {
  host: string;
  path: string;
  origin: string;
} {
  try {
    const url = new URL(ingestUrl);
    return {
      host: url.host,
      path: `${url.pathname}${url.search}`,
      origin: url.origin,
    };
  } catch {
    return {
      host: "thermaltrace.dev",
      path: "/api/ingest/YOUR_DEVICE_KEY",
      origin: "https://thermaltrace.dev",
    };
  }
}

/** Escape for embedding in a double-quoted C string. */
function cEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Data-URL href for a downloadable text file. */
export function firmwareDownloadHref(contents: string): string {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(contents)}`;
}

export function buildArduinoHttpClientSnippet(
  ingestUrl: string,
  sensors: WaitingSensorHint[] = [{ key: "temp1", kind: "temperature" }],
): string {
  const { host, path } = parseIngestUrlParts(ingestUrl);
  const payload = buildWaitingIngestPayload(sensors);
  const body = JSON.stringify(payload).replace(/"/g, '\\"');
  return `// After WiFiClientSecure client is connected:
client.println("POST ${path} HTTP/1.1");
client.println("Host: ${host}");
client.println("Content-Type: application/json");
client.print("Content-Length: ");
client.println(strlen("${body}"));
client.println();
client.print("${body}");
// Full URL: ${ingestUrl}`;
}

/** Full DS18B20 Arduino / ESP32 sketch with INGEST_URL pre-filled. */
export function buildPersonalizedDs18b20Ino(ingestUrl: string): string {
  const url = cEscape(ingestUrl);
  return `/**
 * DS18B20 → ThermalTrace push ingest (ESP32 / ESP8266 Arduino core).
 *
 * 1. Install board: Tools → Board → ESP32 Arduino (or ESP8266).
 * 2. Libraries: OneWire, DallasTemperature (Library Manager).
 * 3. Set WIFI_SSID / WIFI_PASS below, flash, open Serial at 115200.
 * 4. Expect: WiFi ok, then POST 200 {"temp1":…,"rssi":…}
 *
 * Default probe: DS18B20 on GPIO4 → sensor key temp1.
 * Generated from Dashboard → Devices (ingest URL pre-filled).
 */
#include <OneWire.h>
#include <DallasTemperature.h>

#if defined(ESP32) || defined(ESP8266)
#include <WiFi.h>
#include <HTTPClient.h>
#else
#error "This sample targets ESP32/ESP8266. Adapt WiFi/HTTP for your board."
#endif

#ifndef WIFI_SSID
#define WIFI_SSID "your-wifi"
#endif
#ifndef WIFI_PASS
#define WIFI_PASS "your-password"
#endif
#ifndef INGEST_URL
#define INGEST_URL "${url}"
#endif

#ifndef ONE_WIRE_PIN
#define ONE_WIRE_PIN 4
#endif

OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature sensors(&oneWire);

const unsigned long INTERVAL_MS = 60UL * 1000UL;
unsigned long lastPost = 0;

void setup() {
  Serial.begin(115200);
  sensors.begin();
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println(" ok");
}

bool postTempF(float tempF) {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  http.begin(INGEST_URL);
  http.addHeader("Content-Type", "application/json");
  char body[128];
  snprintf(body, sizeof(body), "{\\"temp1\\":%.2f,\\"rssi\\":%d}", tempF, WiFi.RSSI());
  int code = http.POST(body);
  Serial.printf("POST %d %s\\n", code, body);
  http.end();
  return code >= 200 && code < 300;
}

void loop() {
  unsigned long now = millis();
  if (now - lastPost < INTERVAL_MS) return;
  lastPost = now;

  sensors.requestTemperatures();
  float c = sensors.getTempCByIndex(0);
  if (c == DEVICE_DISCONNECTED_C) {
    Serial.println("DS18B20 disconnected");
    return;
  }
  float f = c * 9.0f / 5.0f + 32.0f;
  postTempF(f);
}
`;
}

/** MicroPython main.py with INGEST_URL pre-filled. */
export function buildPersonalizedDs18b20Micropython(ingestUrl: string): string {
  const urlLit = JSON.stringify(ingestUrl);
  return `"""
DS18B20 → ThermalTrace push ingest (MicroPython / ESP32).

1. Flash MicroPython on the ESP32.
2. Set WIFI_SSID / WIFI_PASS below.
3. Copy this file to the board as main.py (Thonny / mpremote).
4. Serial should show wifi … then POST 200 …

Default: DS18B20 on GPIO4 → temp1.
Generated from Dashboard → Devices (ingest URL pre-filled).
"""

import json
import time

import ds18x20
import network
import onewire
import urequests
from machine import Pin

WIFI_SSID = "your-wifi"
WIFI_PASS = "your-password"
INGEST_URL = ${urlLit}
ONE_WIRE_PIN = 4
INTERVAL_S = 60


def connect_wifi() -> network.WLAN:
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        wlan.connect(WIFI_SSID, WIFI_PASS)
        for _ in range(40):
            if wlan.isconnected():
                break
            time.sleep(0.5)
    print("wifi", wlan.ifconfig())
    return wlan


def read_temp_f(ds: ds18x20.DS18X20, rom) -> float:
    ds.convert_temp()
    time.sleep_ms(750)
    c = ds.read_temp(rom)
    return c * 9.0 / 5.0 + 32.0


def post(temp_f: float, rssi: int) -> None:
    body = json.dumps({"temp1": round(temp_f, 2), "rssi": rssi})
    try:
        r = urequests.post(
            INGEST_URL,
            data=body,
            headers={"Content-Type": "application/json"},
        )
        print("POST", r.status_code, body)
        r.close()
    except OSError as exc:
        print("POST failed", exc)


def main() -> None:
    wlan = connect_wifi()
    ds = ds18x20.DS18X20(onewire.OneWire(Pin(ONE_WIRE_PIN)))
    roms = ds.scan()
    if not roms:
        raise SystemExit("No DS18B20 found")
    print("found", len(roms), "sensor(s)")
    while True:
        temp_f = read_temp_f(ds, roms[0])
        post(temp_f, wlan.status("rssi") if hasattr(wlan, "status") else 0)
        time.sleep(INTERVAL_S)


if __name__ == "__main__":
    main()
`;
}

/** Minimal ESPHome http_request block with the user’s ingest URL. */
export function buildPersonalizedEspHomeYaml(
  ingestUrl: string,
  sensors: WaitingSensorHint[] = [{ key: "temp1", kind: "temperature" }],
): string {
  const payload = buildWaitingIngestPayload(sensors);
  const body = JSON.stringify(payload);
  return `# Paste into an ESPHome package / automation action.
# Set WiFi in your device YAML secrets as usual.
# Ingest URL is pre-filled from Dashboard → Devices.

http_request.post:
  url: ${ingestUrl}
  headers:
    Content-Type: application/json
  body: '${body}'
`;
}
