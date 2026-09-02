/**
 * Arduino Uno + W5100 Ethernet shield → ThermalTrace push (and optional LAN pull).
 *
 * Hardware matches the garage wiring guides (DHT22 on A4/A5; SPI 10–13 for Ethernet):
 *   https://thermaltrace.dev/about/arduino-pin-wiring
 *
 * The Uno cannot speak HTTPS. Point INGEST_HOST at a LAN HTTP→HTTPS relay:
 *   sketches/relay/push_https_forward.py
 * or a self-hosted HTTP ingest URL. Payload is the classic `temp` object
 * ThermalTrace auto-imports on POST /api/ingest/<key>.
 *
 * Libraries: Ethernet (Arduino), DHT sensor library (Adafruit).
 * Board: Arduino Uno. Serial 9600. Expect HTTP 200 on the relay / ingest log.
 *
 * Numbers use dtostrf — AVR snprintf has no %f unless you link printf_flt.
 */
#include <SPI.h>
#include <Ethernet.h>
#include <DHT.h>
#include <string.h>

#ifndef DHT_PIN_1
#define DHT_PIN_1 A4
#endif
#ifndef DHT_PIN_2
#define DHT_PIN_2 A5
#endif
#ifndef DHT_TYPE
#define DHT_TYPE DHT22
#endif

#ifndef SD_CS_PIN
#define SD_CS_PIN 4
#endif

#ifndef INGEST_HOST
#define INGEST_HOST "192.168.1.50"
#endif
#ifndef INGEST_PORT
#define INGEST_PORT 8080
#endif
#ifndef INGEST_PATH
#define INGEST_PATH "/api/ingest/YOUR_DEVICE_KEY"
#endif

#ifndef SERVE_PULL
#define SERVE_PULL 1
#endif

#ifndef INTERVAL_MS
#define INTERVAL_MS (60UL * 1000UL)
#endif

byte mac[] = {0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED};

DHT dht1(DHT_PIN_1, DHT_TYPE);
DHT dht2(DHT_PIN_2, DHT_TYPE);
EthernetClient client;

#if SERVE_PULL
EthernetServer server(80);
#endif

char jsonBody[280];
unsigned long lastPost = 0;

bool readProbe(DHT &dht, float &c, float &h) {
  c = dht.readTemperature();
  h = dht.readHumidity();
  return !isnan(c) && !isnan(h);
}

float toF(float c) {
  return c * 9.0f / 5.0f + 32.0f;
}

bool appendStr(size_t &off, const char *s) {
  size_t n = strlen(s);
  if (off + n >= sizeof(jsonBody)) return false;
  memcpy(jsonBody + off, s, n);
  off += n;
  jsonBody[off] = '\0';
  return true;
}

void fmt1(char *out, float v) {
  dtostrf(v, 0, 1, out);
}

bool appendProbe(size_t &off, const char *key, float c, float h) {
  char cs[10];
  char fs[10];
  char hs[10];
  fmt1(cs, c);
  fmt1(fs, toF(c));
  fmt1(hs, h);
  if (!appendStr(off, "\"")) return false;
  if (!appendStr(off, key)) return false;
  if (!appendStr(off, "\":{\"c\":")) return false;
  if (!appendStr(off, cs)) return false;
  if (!appendStr(off, ",\"f\":")) return false;
  if (!appendStr(off, fs)) return false;
  if (!appendStr(off, ",\"h\":")) return false;
  if (!appendStr(off, hs)) return false;
  if (!appendStr(off, "},")) return false;
  return true;
}

/** Classic ThermalTrace garage JSON: temp.0 / temp.1 / temp.avg. Returns 0 on read failure. */
int buildTempJson() {
  float c0, h0, c1, h1;
  bool ok0 = readProbe(dht1, c0, h0);
  bool ok1 = readProbe(dht2, c1, h1);
  if (!ok0 && !ok1) return 0;

  float cAvg = 0;
  float hAvg = 0;
  int n = 0;
  if (ok0) {
    cAvg += c0;
    hAvg += h0;
    n++;
  }
  if (ok1) {
    cAvg += c1;
    hAvg += h1;
    n++;
  }
  cAvg /= (float)n;
  hAvg /= (float)n;

  size_t off = 0;
  jsonBody[0] = '\0';
  if (!appendStr(off, "{\"temp\":{")) return 0;
  if (ok0 && !appendProbe(off, "0", c0, h0)) return 0;
  if (ok1 && !appendProbe(off, "1", c1, h1)) return 0;
  if (!appendProbe(off, "avg", cAvg, hAvg)) return 0;

  if (off == 0) return 0;
  jsonBody[off - 1] = '}';
  if (!appendStr(off, "}")) return 0;
  return (int)off;
}

bool connectIngest() {
  IPAddress ip;
  if (ip.fromString(INGEST_HOST)) {
    return client.connect(ip, INGEST_PORT);
  }
  return client.connect(INGEST_HOST, INGEST_PORT);
}

void postIngest() {
  int n = buildTempJson();
  if (n <= 0) {
    Serial.println(F("dht_read"));
    return;
  }

  Serial.print(F("POST "));
  Serial.println(jsonBody);

  if (!connectIngest()) {
    Serial.println(F("connect failed"));
    return;
  }

  client.print(F("POST "));
  client.print(INGEST_PATH);
  client.println(F(" HTTP/1.1"));
  client.print(F("Host: "));
  client.println(INGEST_HOST);
  client.println(F("Content-Type: application/json"));
  client.print(F("Content-Length: "));
  client.println(n);
  client.println(F("Connection: close"));
  client.println();
  client.print(jsonBody);

  unsigned long start = millis();
  while (client.connected() && millis() - start < 4000) {
    while (client.available()) {
      Serial.write(client.read());
    }
  }
  client.stop();
  Serial.println();
}

#if SERVE_PULL
void handlePullClient() {
  EthernetClient req = server.available();
  if (!req) return;

  while (req.connected() && !req.available()) {
    delay(1);
  }
  while (req.available()) {
    req.read();
  }

  int n = buildTempJson();
  if (n <= 0) {
    const char err[] = "{\"error\":\"dht_read\"}";
    req.println(F("HTTP/1.1 503 Service Unavailable"));
    req.println(F("Content-Type: application/json"));
    req.println(F("Connection: close"));
    req.print(F("Content-Length: "));
    req.println(strlen(err));
    req.println();
    req.print(err);
  } else {
    req.println(F("HTTP/1.1 200 OK"));
    req.println(F("Content-Type: application/json"));
    req.println(F("Connection: close"));
    req.print(F("Content-Length: "));
    req.println(n);
    req.println();
    req.print(jsonBody);
  }
  delay(1);
  req.stop();
}
#endif

void setup() {
  Serial.begin(9600);

  pinMode(SD_CS_PIN, OUTPUT);
  digitalWrite(SD_CS_PIN, HIGH);

  dht1.begin();
  dht2.begin();
  delay(2000);

  Serial.println(F("Ethernet DHCP…"));
  if (Ethernet.begin(mac) == 0) {
    Serial.println(F("DHCP failed"));
    while (true) delay(1000);
  }
  delay(1000);
  Serial.print(F("IP "));
  Serial.println(Ethernet.localIP());

#if SERVE_PULL
  server.begin();
  Serial.println(F("Pull JSON on port 80"));
#endif
}

void loop() {
  Ethernet.maintain();

#if SERVE_PULL
  handlePullClient();
#endif

  unsigned long now = millis();
  if (now - lastPost >= INTERVAL_MS) {
    lastPost = now;
    postIngest();
  }
}
