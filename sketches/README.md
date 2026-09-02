# ThermalTrace sensor sketches

Sample firmware that POSTs readings to your push-device ingest URL:

```http
POST https://thermaltrace.dev/api/ingest/<device-key>
Content-Type: application/json
```

Create a push device under **Dashboard → Devices**, then use **Download Arduino .ino** / **MicroPython .py** on the ingest callout (URL pre-filled). Or copy the key manually into a sketch from this folder (`INGEST_URL`). Use **Reveal ingest key** on the device card if you lose it later (when key recovery is enabled on the server).

Payload examples match `/about/ingest-and-webhooks` and `/docs/api`.

| Sketch | Sensor | Runtime |
|--------|--------|---------|
| [`arduino/ds18b20_ingest`](arduino/ds18b20_ingest/) | DS18B20 (1-Wire) · GPIO4 → `temp1` | Arduino / ESP32 (+ `platformio.ini`) |
| [`arduino/ds18b20_wifimanager`](arduino/ds18b20_wifimanager/) | DS18B20 + captive-portal Wi‑Fi | Arduino / ESP32 |
| [`arduino/max31855_ingest`](arduino/max31855_ingest/) | MAX31855 thermocouple amp | Arduino / ESP32 |
| [`arduino/max6675_ingest`](arduino/max6675_ingest/) | MAX6675 thermocouple amp | Arduino / ESP32 |
| [`micropython/ds18b20_ingest.py`](micropython/ds18b20_ingest.py) | DS18B20 | MicroPython (ESP32) |
| [`micropython/max31855_ingest.py`](micropython/max31855_ingest.py) | MAX31855 | MicroPython (ESP32) |

**ESP32 flash checklist:** board package (ESP32, not Uno Ethernet samples) → libraries `OneWire` + `DallasTemperature` → set Wi‑Fi → Serial **115200** → expect `POST 200`. Full options (IDE, PlatformIO, MicroPython, esptool-js): [thermaltrace.dev/about/esp32-web-flash](https://thermaltrace.dev/about/esp32-web-flash).

Replace Wi-Fi credentials before flashing. Prefer HTTPS when your board stack supports TLS; otherwise use a local relay (see `/about/python-feeds`).
