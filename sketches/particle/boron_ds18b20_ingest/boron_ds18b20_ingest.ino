/**
 * DS18B20 → ThermalTrace push ingest (Particle Boron / B-Series cellular).
 *
 * Cellular has no garage Wi‑Fi. This sketch publishes JSON on Particle Cloud;
 * a Console webhook POSTs it to your HTTPS ingest URL. ThermalTrace already
 * flags stale / faulty probes when posts stop during network dropouts.
 *
 * 1. Create a push device. Download this file from Devices (ingest URL in comments).
 * 2. Particle Workbench or Web IDE: target Boron / B404X / B524, Device OS 5+.
 * 3. Libraries: OneWire, spark-dallas-temperature (Particle library list).
 * 4. Console → Integrations → Webhook:
 *      Event name: thermaltrace_ingest
 *      URL: see INGEST_URL below
 *      Request type: POST
 *      Form / JSON: {{SPARK_EVENT_VALUE}}  (raw JSON body)
 *      Content-Type: application/json
 * 5. Serial 115200: cellular ok, then publish ok. Expect POST 200 in webhook history.
 *
 * Wiring: DS18B20 VDD 3.3V, GND, data → D2, 4.7k to 3.3V.
 * Optional Blues Notecard path: see /about/cellular-ingest (Notehub route).
 */

#include "Particle.h"
#include <OneWire.h>
#include <spark-dallas-temperature.h>

SYSTEM_THREAD(ENABLED);
SYSTEM_MODE(AUTOMATIC);

#ifndef ONE_WIRE_PIN
#define ONE_WIRE_PIN D2
#endif

/* Full HTTPS ingest URL — paste into Particle Console webhook URL field. */
#ifndef INGEST_URL
#define INGEST_URL "https://thermaltrace.dev/api/ingest/YOUR_DEVICE_KEY"
#endif

#ifndef PUBLISH_EVENT
#define PUBLISH_EVENT "thermaltrace_ingest"
#endif

const unsigned long INTERVAL_MS = 60UL * 1000UL;
unsigned long lastPost = 0;

OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature sensors(&oneWire);

void setup() {
  Serial.begin(115200);
  sensors.begin();
  waitFor(Serial, 8000);
  Serial.printlnf("ThermalTrace Boron ingest → webhook %s", INGEST_URL);
}

bool publishTempF(float tempF) {
  if (!Particle.connected()) {
    Serial.println("cellular wait");
    return false;
  }
  /* Particle webhooks forward SPARK_EVENT_VALUE as the POST body. */
  char body[96];
  snprintf(body, sizeof(body), "{\"temp1\":%.2f}", (double)tempF);
  bool ok = Particle.publish(PUBLISH_EVENT, body, PRIVATE);
  Serial.printlnf("publish %s %s", ok ? "ok" : "fail", body);
  return ok;
}

void loop() {
  unsigned long now = millis();
  if (now - lastPost < INTERVAL_MS) {
    return;
  }
  lastPost = now;

  sensors.requestTemperatures();
  float c = sensors.getTempCByIndex(0);
  if (c == DEVICE_DISCONNECTED_C) {
    Serial.println("DS18B20 disconnected");
    return;
  }
  float f = c * 9.0f / 5.0f + 32.0f;
  publishTempF(f);
}
