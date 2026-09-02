# Sensor sketches

Firmware samples live in the repo:

**[`sketches/`](https://github.com/doodersrage/thermaltrace/tree/main/sketches)**

Each sketch POSTs to your push-device ingest URL. On **Dashboard → Devices**, create a push device and use **Download Arduino .ino** / **MicroPython .py** (URL pre-filled). Or copy a sketch from this folder and set `INGEST_URL` yourself. Always set Wi-Fi credentials (ESP) or `INGEST_HOST` / `INGEST_PATH` (Uno Ethernet) before flashing.

## Matrix

| Path | Sensor | Stack |
|------|--------|-------|
| [`arduino/ds18b20_ingest`](https://github.com/doodersrage/thermaltrace/tree/main/sketches/arduino/ds18b20_ingest) | DS18B20 (1-Wire) | Arduino / ESP32 (+ PlatformIO) |
| [`arduino/ds18b20_wifimanager`](https://github.com/doodersrage/thermaltrace/tree/main/sketches/arduino/ds18b20_wifimanager) | DS18B20 + WiFiManager | Arduino / ESP32 |
| [`arduino/ethernet_dht22_ingest`](https://github.com/doodersrage/thermaltrace/tree/main/sketches/arduino/ethernet_dht22_ingest) | Dual DHT22 + W5100 | Uno Ethernet (HTTP push + LAN pull) |
| [`arduino/max31855_ingest`](https://github.com/doodersrage/thermaltrace/tree/main/sketches/arduino/max31855_ingest) | MAX31855 thermocouple | Arduino / ESP32 |
| [`arduino/max6675_ingest`](https://github.com/doodersrage/thermaltrace/tree/main/sketches/arduino/max6675_ingest) | MAX6675 thermocouple | Arduino / ESP32 |
| [`micropython/ds18b20_ingest.py`](https://github.com/doodersrage/thermaltrace/blob/main/sketches/micropython/ds18b20_ingest.py) | DS18B20 | MicroPython ESP32 |
| [`micropython/max31855_ingest.py`](https://github.com/doodersrage/thermaltrace/blob/main/sketches/micropython/max31855_ingest.py) | MAX31855 | MicroPython ESP32 |

## What they send

Arduino DS18B20 / MAX6675 samples use flat keys:

```json
{ "temp1": 68.4, "rssi": -58 }
```

MAX31855 samples use typed sensors:

```json
{
  "sensors": [
    { "key": "tc1", "kind": "temperature", "value": 412.0, "unit": "F" }
  ],
  "rssi": -58
}
```

Add matching sensor keys on **Dashboard → Devices** after the first POST.

Uno Ethernet samples send the classic `temp` object (`0` / `1` / `avg` with `c`, `f`, `h`) instead of flat `temp1`.

## Checklist

1. Create push device on Devices; download pre-filled sketch (or paste `INGEST_URL`)
2. Edit `WIFI_*` only
3. Flash ESP32; watch serial (115200) for `POST 200`
4. Open Home on thermaltrace.dev
5. Set freeze alerts under Dashboard → Alerts

## Uno + Ethernet shield

The W5100 cannot TLS. Use [`ethernet_dht22_ingest`](https://github.com/doodersrage/thermaltrace/tree/main/sketches/arduino/ethernet_dht22_ingest) (DHT22 on A4/A5, HTTP POST + optional LAN pull on port 80) and run [`push_https_forward.py`](https://github.com/doodersrage/thermaltrace/blob/main/sketches/relay/push_https_forward.py) on a LAN host:

```bash
python3 sketches/relay/push_https_forward.py --listen 0.0.0.0:8080 \
  --upstream https://thermaltrace.dev
```

Set `INGEST_HOST` to that machine and `INGEST_PATH` to `/api/ingest/<your-key>`.

## Full garage stack

Ethernet + dual DHT22 + LCD firmware (separate repo):  
[arduino-network-json-temperature-sever](https://github.com/doodersrage/arduino-network-json-temperature-sever)

Wiring / LCD guides on the product site: [About → Arduino](https://thermaltrace.dev/about/arduino-sketches)
