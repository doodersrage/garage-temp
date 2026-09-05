/**
 * DS18B20 → ThermalTrace push ingest (Teensy 4.1 + onboard Ethernet).
 *
 * NXP i.MX RT1062, PJRC Teensy 4.1 with Ethernet kit (magnetics + RJ45).
 * QNEthernet + HTTP to the same LAN TLS relay as Uno / STM32 / CH32V.
 * Not required to bake Cloudflare CAs into the MCU.
 *
 * 1. Install Teensyduino. Library Manager / Teensy: QNEthernet, OneWire, DallasTemperature.
 * 2. Create a push device. Download this file from Devices (INGEST_PATH filled).
 * 3. Run sketches/relay/push_https_forward.py on a LAN host.
 * 4. Set INGEST_HOST to that machine. Flash over USB. Serial 115200 → link ok, POST 200.
 *
 * Wiring: DS18B20 VDD 3.3V, GND, data → pin 4, 4.7k to 3.3V.
 * Ethernet: Teensy 4.1 Ethernet kit / MagJack per PJRC docs.
 */

#include <QNEthernet.h>
#include <OneWire.h>
#include <DallasTemperature.h>

using namespace qindesign::network;

#ifndef INGEST_HOST
#define INGEST_HOST "192.168.1.50"
#endif
#ifndef INGEST_PORT
#define INGEST_PORT 8080
#endif
#ifndef INGEST_PATH
#define INGEST_PATH "/api/ingest/YOUR_DEVICE_KEY"
#endif

#ifndef ONE_WIRE_PIN
#define ONE_WIRE_PIN 4
#endif

const uint32_t INTERVAL_MS = 60UL * 1000UL;
uint32_t lastPost = 0;

OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature sensors(&oneWire);
EthernetClient client;

bool waitForLinkAndDhcp() {
  Serial.print("link");
  uint32_t start = millis();
  while (!Ethernet.linkStatus()) {
    if (millis() - start > 20000UL) {
      Serial.println(" timeout");
      return false;
    }
    delay(250);
    Serial.print(".");
  }
  Serial.println(" ok");

  Serial.print("dhcp");
  start = millis();
  while (!Ethernet.waitForLocalIP(1000)) {
    if (millis() - start > 45000UL) {
      Serial.println(" timeout");
      return false;
    }
    Serial.print(".");
  }
  Serial.print(" ok ");
  Serial.println(Ethernet.localIP());
  return true;
}

bool postTempF(float tempF) {
  char body[96];
  snprintf(body, sizeof(body), "{\"temp1\":%.2f}", (double)tempF);

  if (!client.connect(INGEST_HOST, INGEST_PORT)) {
    Serial.println("connect fail");
    return false;
  }

  client.print("POST ");
  client.print(INGEST_PATH);
  client.println(" HTTP/1.1");
  client.print("Host: ");
  client.println(INGEST_HOST);
  client.println("Content-Type: application/json");
  client.print("Content-Length: ");
  client.println(strlen(body));
  client.println("Connection: close");
  client.println();
  client.print(body);

  uint32_t deadline = millis() + 8000UL;
  int code = 0;
  while (client.connected() && millis() < deadline) {
    while (client.available()) {
      String line = client.readStringUntil('\n');
      if (line.startsWith("HTTP/1.")) {
        int sp = line.indexOf(' ');
        if (sp > 0) {
          code = line.substring(sp + 1).toInt();
        }
      }
    }
  }
  client.stop();
  Serial.printf("POST %d %s\n", code, body);
  return code >= 200 && code < 300;
}

void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 3000) {
    /* USB serial */
  }
  sensors.begin();

  uint8_t mac[6];
  Ethernet.macAddress(mac);
  Serial.printf("mac %02X:%02X:%02X:%02X:%02X:%02X\n",
                mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);

  if (!Ethernet.begin()) {
    Serial.println("Ethernet.begin failed");
    return;
  }
  if (!waitForLinkAndDhcp()) {
    return;
  }
}

void loop() {
  uint32_t now = millis();
  if (now - lastPost < INTERVAL_MS) {
    return;
  }
  lastPost = now;

  if (!Ethernet.linkStatus()) {
    Serial.println("link down");
    return;
  }

  sensors.requestTemperatures();
  float c = sensors.getTempCByIndex(0);
  if (c == DEVICE_DISCONNECTED_C) {
    Serial.println("DS18B20 disconnected");
    return;
  }
  float f = c * 9.0f / 5.0f + 32.0f;
  postTempF(f);
}
