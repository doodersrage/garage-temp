# ThermalTrace sensor sketches

Sample firmware that POSTs readings to your push-device ingest URL:

```http
POST https://thermaltrace.dev/api/ingest/<device-key>
Content-Type: application/json
```

Create a push device under **Dashboard → Devices**, copy the key from the callout (30 minutes, survives refresh), and set it in the sketch (`INGEST_KEY` / `INGEST_URL`). Use **Reveal ingest key** on the device card if you lose it later (when key recovery is enabled on the server).

Payload examples match `/about/ingest-and-webhooks` and `/docs/api`.

| Sketch | Sensor | Runtime |
|--------|--------|---------|
| [`arduino/ds18b20_ingest`](arduino/ds18b20_ingest/) | DS18B20 (1-Wire) | Arduino / ESP32 Arduino core |
| [`arduino/max31855_ingest`](arduino/max31855_ingest/) | MAX31855 thermocouple amp | Arduino / ESP32 |
| [`arduino/max6675_ingest`](arduino/max6675_ingest/) | MAX6675 thermocouple amp | Arduino / ESP32 |
| [`micropython/ds18b20_ingest.py`](micropython/ds18b20_ingest.py) | DS18B20 | MicroPython (ESP32) |
| [`micropython/max31855_ingest.py`](micropython/max31855_ingest.py) | MAX31855 | MicroPython (ESP32) |

Replace Wi-Fi credentials and the ingest URL before flashing. Prefer HTTPS when your board stack supports TLS; otherwise use a local relay (see `/about/python-feeds`).
