/**
 * Personalized firmware helpers for the Devices ingest callout.
 * ESP32 / Pico W: WiFi stays as placeholders; INGEST_URL is filled from the user’s device key.
 * Uno / STM32 / CH32V / AVR / PIC18 / Teensy Ethernet: INGEST_PATH is filled; INGEST_HOST is a LAN HTTP→HTTPS relay.
 * Particle Boron cellular: INGEST_URL is filled for the Console webhook.
 */

import ch32vMainC from "../../sketches/wch/ch32v307_ds18b20_ingest/src/main.c?raw";
import avrMainS from "../../sketches/avr/atmega328_w5100_ds18b20/main.S?raw";
import pic18MainC from "../../sketches/microchip/pic18f67j60_ds18b20_ingest/main.c?raw";
import teensyIno from "../../sketches/teensy/teensy41_ds18b20_ingest/teensy41_ds18b20_ingest.ino?raw";
import particleIno from "../../sketches/particle/boron_ds18b20_ingest/boron_ds18b20_ingest.ino?raw";
import particleWebhookJson from "../../sketches/particle/boron_ds18b20_ingest/webhook.json?raw";

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

/** Uno + W5100 cannot TLS — host is a LAN HTTP→HTTPS relay; path is the real ingest path. */
export function buildArduinoEthernetDefinesSnippet(ingestUrl: string): string {
  const { path } = parseIngestUrlParts(ingestUrl);
  return `// Uno + W5100 cannot TLS. Run sketches/relay/push_https_forward.py
// on a LAN host, then set:
#define INGEST_HOST "192.168.1.50"
#define INGEST_PORT 8080
#define INGEST_PATH "${cEscape(path)}"
// Sketch: sketches/arduino/ethernet_dht22_ingest/
// Full HTTPS URL (relay forwards this path): ${ingestUrl}`;
}

/** Full DS18B20 Arduino / ESP32 / Pico W sketch with INGEST_URL pre-filled. */
export function buildPersonalizedDs18b20Ino(ingestUrl: string): string {
  const url = cEscape(ingestUrl);
  return `/**
 * DS18B20 → ThermalTrace push ingest (ESP32 / ESP8266 / Pico W Arduino core).
 *
 * 1. Install board: ESP32 Arduino, ESP8266, or Earle Philhower Pico/RP2040 (Pico W).
 * 2. Libraries: OneWire, DallasTemperature (Library Manager).
 * 3. Set WIFI_SSID / WIFI_PASS below, flash, open Serial at 115200.
 * 4. Expect: WiFi ok, then POST 200 {"temp1":…,"rssi":…}
 *
 * Default probe: DS18B20 on GPIO4 / GP4 → sensor key temp1.
 * Generated from Dashboard → Devices (ingest URL pre-filled).
 */
#include <OneWire.h>
#include <DallasTemperature.h>

#if defined(ESP32) || defined(ESP8266) || defined(ARDUINO_ARCH_RP2040) || defined(ARDUINO_ARCH_RP2350)
#include <WiFi.h>
#include <HTTPClient.h>
#else
#error "This sample targets ESP32/ESP8266 or Pico W (Earle Philhower core). Adapt WiFi/HTTP for your board."
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

/** MicroPython main.py with INGEST_URL pre-filled (ESP32 or Pico W). */
export function buildPersonalizedDs18b20Micropython(ingestUrl: string): string {
  const urlLit = JSON.stringify(ingestUrl);
  return `"""
DS18B20 → ThermalTrace push ingest (MicroPython / ESP32 / Pico W).

1. Flash MicroPython on the ESP32 or Pico W / Pico 2 W.
2. Set WIFI_SSID / WIFI_PASS below.
3. Copy this file to the board as main.py (Thonny / mpremote).
4. Serial should show wifi … then POST 200 …

Default: DS18B20 on GPIO4 / GP4 → temp1.
Generated from Dashboard → Devices (ingest URL pre-filled).
"""

import json
import time

import ds18x20
import network
import onewire
from machine import Pin

try:
    import urequests as requests
except ImportError:
    import requests

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


def wifi_rssi(wlan: network.WLAN) -> int:
    try:
        return int(wlan.status("rssi"))
    except (TypeError, ValueError, OSError):
        return 0


def post(temp_f: float, rssi: int) -> None:
    body = json.dumps({"temp1": round(temp_f, 2), "rssi": rssi})
    try:
        r = requests.post(
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
        post(temp_f, wifi_rssi(wlan))
        time.sleep(INTERVAL_S)


if __name__ == "__main__":
    main()
`;
}

/** CircuitPython code.py with INGEST_URL pre-filled (Pico W / Pico 2 W). */
export function buildPersonalizedDs18b20Circuitpython(ingestUrl: string): string {
  const urlLit = JSON.stringify(ingestUrl);
  return `"""
DS18B20 → ThermalTrace push ingest (CircuitPython / Pico W).

1. Flash CircuitPython UF2 for Pico W or Pico 2 W.
2. circup install adafruit_requests adafruit_connection_manager adafruit_ds18x20 adafruit_onewire
3. Set WIFI_SSID / WIFI_PASS below.
4. Copy this file to the CIRCUITPY drive as code.py.
5. Serial should show wifi ok, then POST 200 …

Default: DS18B20 on GP4 (4.7k pull-up to 3.3V) → temp1.
Generated from Dashboard → Devices (ingest URL pre-filled).
"""

import json
import time

import adafruit_connection_manager
import adafruit_ds18x20
import adafruit_requests
import board
import wifi
from adafruit_onewire.bus import OneWireBus

WIFI_SSID = "your-wifi"
WIFI_PASS = "your-password"
INGEST_URL = ${urlLit}
INTERVAL_S = 60


def onewire_pin():
    for name in ("GP4", "IO4", "D4"):
        pin = getattr(board, name, None)
        if pin is not None:
            return pin
    raise RuntimeError("No GP4/IO4/D4 on this board — edit onewire_pin()")


def connect_wifi() -> None:
    if wifi.radio.connected:
        return
    print("wifi connecting")
    wifi.radio.connect(WIFI_SSID, WIFI_PASS)
    print("wifi ok", wifi.radio.ipv4_address)


def rssi() -> int:
    info = wifi.radio.ap_info
    if info is None:
        return 0
    return int(info.rssi)


def main() -> None:
    connect_wifi()
    pool = adafruit_connection_manager.get_radio_socketpool(wifi.radio)
    ssl_context = adafruit_connection_manager.get_radio_ssl_context(wifi.radio)
    http = adafruit_requests.Session(pool, ssl_context)

    ow_bus = OneWireBus(onewire_pin())
    devices = ow_bus.scan()
    if not devices:
        raise RuntimeError("No DS18B20 found")
    sensor = adafruit_ds18x20.DS18X20(ow_bus, devices[0])
    print("found", len(devices), "sensor(s)")

    while True:
        temp_f = sensor.temperature * 9.0 / 5.0 + 32.0
        body = json.dumps({"temp1": round(temp_f, 2), "rssi": rssi()})
        try:
            response = http.post(
                INGEST_URL,
                data=body,
                headers={"Content-Type": "application/json"},
            )
            print("POST", response.status_code, body)
            response.close()
        except OSError as exc:
            print("POST failed", exc)
            connect_wifi()
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

/** Nucleo Ethernet cannot assume Cloudflare CA pinning — host is a LAN HTTP→HTTPS relay. */
export function buildZephyrEthernetDefinesSnippet(ingestUrl: string): string {
  const { path } = parseIngestUrlParts(ingestUrl);
  return `/* STM32 Nucleo-F767ZI + Zephyr. Same LAN relay as Uno + W5100:
 * sketches/relay/push_https_forward.py
 */
#define INGEST_HOST "192.168.1.50"
#define INGEST_PORT 8080
#define INGEST_PATH "${cEscape(path)}"
/* App: sketches/zephyr/ds18b20_ingest/  (west build -b nucleo_f767zi)
 * DS18B20 on Arduino D4 / PF14. Full HTTPS URL: ${ingestUrl} */`;
}

/** Full Zephyr main.c with INGEST_PATH pre-filled. */
export function buildPersonalizedDs18b20ZephyrC(ingestUrl: string): string {
  const { path } = parseIngestUrlParts(ingestUrl);
  const ingestPath = cEscape(path);
  return `/**
 * DS18B20 → ThermalTrace push ingest (Zephyr C / STM32 Nucleo-F767ZI).
 *
 * 1. Run sketches/relay/push_https_forward.py on a LAN host.
 * 2. Set INGEST_HOST to that machine if it is not 192.168.1.50.
 * 3. west build -b nucleo_f767zi sketches/zephyr/ds18b20_ingest
 *    (replace src/main.c with this file, or copy INGEST_* defines).
 * 4. west flash. Serial 115200: dhcp ok, then POST 200
 *
 * Wiring: DS18B20 on Arduino D4 (PF14), 4.7k to 3.3V.
 * Generated from Dashboard → Devices (ingest path pre-filled).
 */
#include <zephyr/kernel.h>
#include <zephyr/device.h>
#include <zephyr/drivers/sensor.h>
#include <zephyr/net/http/client.h>
#include <zephyr/net/net_if.h>
#include <zephyr/net/net_ip.h>
#include <zephyr/net/socket.h>
#include <zephyr/net/dhcpv4.h>

#include <errno.h>
#include <stdio.h>
#include <string.h>

#ifndef INGEST_HOST
#define INGEST_HOST "192.168.1.50"
#endif
#ifndef INGEST_PORT
#define INGEST_PORT 8080
#endif
#ifndef INGEST_PATH
#define INGEST_PATH "${ingestPath}"
#endif

#define INTERVAL_MS 60000
#define RECV_BUF_SIZE 512

static uint8_t recv_buf[RECV_BUF_SIZE];

static int wait_for_ipv4(struct net_if *iface)
{
	net_dhcpv4_start(iface);
	for (int i = 0; i < 45; i++) {
		if (net_if_ipv4_get_global_addr(iface, NET_ADDR_PREFERRED) != NULL) {
			printk("dhcp ok\\n");
			return 0;
		}
		k_sleep(K_MSEC(1000));
	}
	printk("dhcp timeout\\n");
	return -ETIMEDOUT;
}

static void http_response_cb(struct http_response *rsp,
			     enum http_final_call final_data,
			     void *user_data)
{
	ARG_UNUSED(user_data);
	if (final_data != HTTP_DATA_FINAL) {
		return;
	}
	printk("POST %s\\n", rsp->http_status != NULL ? rsp->http_status : "?");
}

static int post_temp_f(float temp_f)
{
	static const char *headers[] = {
		"Content-Type: application/json\\r\\n",
		NULL,
	};
	char body[96];
	struct sockaddr_in addr;
	struct http_request req;
	int sock;
	int ret;

	snprintk(body, sizeof(body), "{\\"temp1\\":%.2f}", (double)temp_f);

	memset(&addr, 0, sizeof(addr));
	addr.sin_family = AF_INET;
	addr.sin_port = htons(INGEST_PORT);
	if (inet_pton(AF_INET, INGEST_HOST, &addr.sin_addr) != 1) {
		printk("bad INGEST_HOST\\n");
		return -EINVAL;
	}

	sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
	if (sock < 0) {
		printk("socket %d\\n", errno);
		return -errno;
	}

	ret = connect(sock, (struct sockaddr *)&addr, sizeof(addr));
	if (ret < 0) {
		printk("connect %d\\n", errno);
		close(sock);
		return -errno;
	}

	memset(&req, 0, sizeof(req));
	req.method = HTTP_POST;
	req.url = INGEST_PATH;
	req.host = INGEST_HOST;
	req.protocol = "HTTP/1.1";
	req.payload = body;
	req.payload_len = strlen(body);
	req.header_fields = headers;
	req.response = http_response_cb;
	req.recv_buf = recv_buf;
	req.recv_buf_len = sizeof(recv_buf);

	ret = http_client_req(sock, &req, 8 * MSEC_PER_SEC, NULL);
	close(sock);
	if (ret < 0) {
		printk("http %d\\n", ret);
		return ret;
	}
	return 0;
}

int main(void)
{
	const struct device *ds = DEVICE_DT_GET_ANY(maxim_ds18b20);
	struct net_if *iface = net_if_get_default();
	struct sensor_value val;

	if (ds == NULL || !device_is_ready(ds)) {
		printk("DS18B20 not ready (check D4 / PF14 wiring)\\n");
		return 0;
	}
	if (iface == NULL) {
		printk("no network interface\\n");
		return 0;
	}
	if (wait_for_ipv4(iface) < 0) {
		return 0;
	}

	while (1) {
		if (sensor_sample_fetch(ds) == 0 &&
		    sensor_channel_get(ds, SENSOR_CHAN_AMBIENT_TEMP, &val) == 0) {
			double c = sensor_value_to_double(&val);
			float f = (float)(c * 9.0 / 5.0 + 32.0);
			printk("temp1 %.2f F\\n", (double)f);
			post_temp_f(f);
		} else {
			printk("DS18B20 read failed\\n");
		}
		k_sleep(K_MSEC(INTERVAL_MS));
	}
}
`;
}

const CH32V_INGEST_PATH_PLACEHOLDER = '#define INGEST_PATH "/api/ingest/YOUR_DEVICE_KEY"';

/** CH32V307 WCHNET cannot TLS — host is a LAN HTTP→HTTPS relay. */
export function buildCh32vEthernetDefinesSnippet(ingestUrl: string): string {
  const { path } = parseIngestUrlParts(ingestUrl);
  return `/* CH32V307V-EVT-R1 + WCHNET. Same LAN relay as Uno + W5100:
 * sketches/relay/push_https_forward.py
 */
#define INGEST_HOST "192.168.1.50"
#define INGEST_PORT 8080
#define INGEST_PATH "${cEscape(path)}"
/* Drop-in: sketches/wch/ch32v307_ds18b20_ingest/src/main.c
 * (MounRiver EVT/EXAM/ETH/DHCP User/main.c). DS18B20 on PB12.
 * Full HTTPS URL: ${ingestUrl} */`;
}

/** Full WCHNET main.c with INGEST_PATH pre-filled. */
export function buildPersonalizedDs18b20Ch32vC(ingestUrl: string): string {
  const { path } = parseIngestUrlParts(ingestUrl);
  const next = `#define INGEST_PATH "${cEscape(path)}"`;
  if (!ch32vMainC.includes(CH32V_INGEST_PATH_PLACEHOLDER)) {
    return ch32vMainC;
  }
  return ch32vMainC.replace(CH32V_INGEST_PATH_PLACEHOLDER, next);
}

const AVR_INGEST_PATH_PLACEHOLDER = '.asciz	"/api/ingest/YOUR_DEVICE_KEY"';

/** ATmega328P + W5100 cannot TLS — host is a LAN HTTP→HTTPS relay. */
export function buildAvrAsmEthernetDefinesSnippet(ingestUrl: string): string {
  const { path } = parseIngestUrlParts(ingestUrl);
  return `; ATmega328P + W5100 GNU AVR assembly. Same LAN relay as Uno Ethernet:
; sketches/relay/push_https_forward.py
ingest_path:
	.asciz	"${cEscape(path)}"
ingest_ip:
	.byte	192, 168, 1, 50
ingest_port:
	.byte	0x1F, 0x90
; Sketch: sketches/avr/atmega328_w5100_ds18b20/main.S
; DS18B20 on D7 (not D4 — Ethernet shield SD CS).
; Full HTTPS URL: ${ingestUrl}`;
}

/** Full AVR GNU assembly listing with ingest_path pre-filled. */
export function buildPersonalizedDs18b20AvrS(ingestUrl: string): string {
  const { path } = parseIngestUrlParts(ingestUrl);
  const next = `.asciz	"${cEscape(path)}"`;
  if (!avrMainS.includes(AVR_INGEST_PATH_PLACEHOLDER)) {
    return avrMainS;
  }
  return avrMainS.replace(AVR_INGEST_PATH_PLACEHOLDER, next);
}

const PIC18_INGEST_PATH_PLACEHOLDER = '#define INGEST_PATH "/api/ingest/YOUR_DEVICE_KEY"';

/** PIC18F67J60 TCP/IP Stack cannot TLS — host is a LAN HTTP→HTTPS relay. */
export function buildPic18EthernetDefinesSnippet(ingestUrl: string): string {
  const { path } = parseIngestUrlParts(ingestUrl);
  return `/* PIC18F67J60 + Microchip TCP/IP Stack. Same LAN relay as Uno + W5100:
 * sketches/relay/push_https_forward.py
 */
#define INGEST_HOST "192.168.1.50"
#define INGEST_PORT 8080
#define INGEST_PATH "${cEscape(path)}"
/* Drop-in: sketches/microchip/pic18f67j60_ds18b20_ingest/main.c
 * (MPLAB X MLA Ethernet demo). DS18B20 on RD0.
 * Full HTTPS URL: ${ingestUrl} */`;
}

/** Full PIC18 MLA application C with INGEST_PATH pre-filled. */
export function buildPersonalizedDs18b20Pic18C(ingestUrl: string): string {
  const { path } = parseIngestUrlParts(ingestUrl);
  const next = `#define INGEST_PATH "${cEscape(path)}"`;
  if (!pic18MainC.includes(PIC18_INGEST_PATH_PLACEHOLDER)) {
    return pic18MainC;
  }
  return pic18MainC.replace(PIC18_INGEST_PATH_PLACEHOLDER, next);
}

const TEENSY_INGEST_PATH_PLACEHOLDER = '#define INGEST_PATH "/api/ingest/YOUR_DEVICE_KEY"';

/** Teensy 4.1 QNEthernet — LAN HTTP→HTTPS relay (same CA story as other Ethernet probes). */
export function buildTeensyEthernetDefinesSnippet(ingestUrl: string): string {
  const { path } = parseIngestUrlParts(ingestUrl);
  return `// Teensy 4.1 + QNEthernet. Same LAN relay as Uno + W5100:
// sketches/relay/push_https_forward.py
#define INGEST_HOST "192.168.1.50"
#define INGEST_PORT 8080
#define INGEST_PATH "${cEscape(path)}"
// Sketch: sketches/teensy/teensy41_ds18b20_ingest/
// DS18B20 on pin 4. Full HTTPS URL: ${ingestUrl}`;
}

/** Full Teensy 4.1 .ino with INGEST_PATH pre-filled. */
export function buildPersonalizedDs18b20TeensyIno(ingestUrl: string): string {
  const { path } = parseIngestUrlParts(ingestUrl);
  const next = `#define INGEST_PATH "${cEscape(path)}"`;
  if (!teensyIno.includes(TEENSY_INGEST_PATH_PLACEHOLDER)) {
    return teensyIno;
  }
  return teensyIno.replace(TEENSY_INGEST_PATH_PLACEHOLDER, next);
}

const PARTICLE_INGEST_URL_PLACEHOLDER =
  '#define INGEST_URL "https://thermaltrace.dev/api/ingest/YOUR_DEVICE_KEY"';
const PARTICLE_WEBHOOK_URL_PLACEHOLDER =
  '"url": "https://thermaltrace.dev/api/ingest/YOUR_DEVICE_KEY"';

/** Particle Boron cellular — Console webhook URL (device publishes JSON). */
export function buildParticleCellularSnippet(ingestUrl: string): string {
  return `// Particle Boron / B-Series cellular. Device publishes JSON;
// Console webhook POSTs to HTTPS ingest. Stale-probe alerts cover dropouts.
// Event: thermaltrace_ingest
// Webhook URL:
${ingestUrl}
// Sketch: sketches/particle/boron_ds18b20_ingest/
// DS18B20 on D2. Libraries: OneWire, spark-dallas-temperature.`;
}

/** Full Particle Boron .ino with INGEST_URL pre-filled (paste into Console webhook). */
export function buildPersonalizedDs18b20ParticleIno(ingestUrl: string): string {
  const next = `#define INGEST_URL "${cEscape(ingestUrl)}"`;
  if (!particleIno.includes(PARTICLE_INGEST_URL_PLACEHOLDER)) {
    return particleIno;
  }
  return particleIno.replace(PARTICLE_INGEST_URL_PLACEHOLDER, next);
}

/** Particle Console webhook JSON with url pre-filled. */
export function buildPersonalizedParticleWebhookJson(ingestUrl: string): string {
  const next = `"url": "${cEscape(ingestUrl)}"`;
  if (!particleWebhookJson.includes(PARTICLE_WEBHOOK_URL_PLACEHOLDER)) {
    return particleWebhookJson;
  }
  return particleWebhookJson.replace(PARTICLE_WEBHOOK_URL_PLACEHOLDER, next);
}
