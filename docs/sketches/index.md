# Sensor sketches

Firmware samples live in the repo:

**[`sketches/`](https://github.com/doodersrage/thermaltrace/tree/main/sketches)**

Each sketch POSTs to your push-device ingest URL. Set Wi-Fi credentials and `INGEST_URL` (full URL including the device key) before flashing.

## Matrix

| Path | Sensor | Stack |
|------|--------|-------|
| [`arduino/ds18b20_ingest`](https://github.com/doodersrage/thermaltrace/tree/main/sketches/arduino/ds18b20_ingest) | DS18B20 (1-Wire) | Arduino / ESP32 core |
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

## Checklist

1. Create push device; save key  
2. Edit `WIFI_*` + `INGEST_URL`  
3. Flash; watch serial for `POST 200`  
4. Open Home on thermaltrace.dev  
5. Set freeze alerts under Dashboard → Alerts  

## Full garage stack

Ethernet + dual DHT22 + LCD firmware (separate repo):  
[arduino-network-json-temperature-sever](https://github.com/doodersrage/arduino-network-json-temperature-sever)

Wiring / LCD guides on the product site: [About → Arduino](https://thermaltrace.dev/about/arduino-sketches)
