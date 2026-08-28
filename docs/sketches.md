# Sensor sketches

Sample firmware in the repo under [`sketches/`](https://github.com/doodersrage/thermaltrace/tree/main/sketches).

Each sketch POSTs to your push-device ingest URL:

```http
POST https://thermaltrace.dev/api/ingest/<device-key>
Content-Type: application/json
```

Set `WIFI_SSID`, `WIFI_PASS`, and `INGEST_URL` (or the MicroPython equivalents) before flashing.

| Sketch | Sensor | Runtime |
|--------|--------|---------|
| [arduino/ds18b20_ingest](https://github.com/doodersrage/thermaltrace/tree/main/sketches/arduino/ds18b20_ingest) | DS18B20 | Arduino / ESP32 |
| [arduino/max31855_ingest](https://github.com/doodersrage/thermaltrace/tree/main/sketches/arduino/max31855_ingest) | MAX31855 | Arduino / ESP32 |
| [arduino/max6675_ingest](https://github.com/doodersrage/thermaltrace/tree/main/sketches/arduino/max6675_ingest) | MAX6675 | Arduino / ESP32 |
| [micropython/ds18b20_ingest.py](https://github.com/doodersrage/thermaltrace/blob/main/sketches/micropython/ds18b20_ingest.py) | DS18B20 | MicroPython |
| [micropython/max31855_ingest.py](https://github.com/doodersrage/thermaltrace/blob/main/sketches/micropython/max31855_ingest.py) | MAX31855 | MicroPython |

Prefer HTTPS when the board stack supports TLS; otherwise use a local relay ([python feeds](https://thermaltrace.dev/about/python-feeds)).

Full garage Ethernet + DHT firmware (separate repo):  
[arduino-network-json-temperature-sever](https://github.com/doodersrage/arduino-network-json-temperature-sever)
