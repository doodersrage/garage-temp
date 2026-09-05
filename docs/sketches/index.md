# Sensor sketches

Firmware samples live in the repo:

**[`sketches/`](https://github.com/doodersrage/thermaltrace/tree/main/sketches)**

Each sketch POSTs to your push-device ingest URL. On **Dashboard → Devices**, create a push device and use **Download Arduino .ino** / **MicroPython .py** / **CircuitPython code.py** / **Zephyr main.c** / **CH32V main.c** / **AVR main.S** / **Teensy 4.1 .ino** / **PIC18 main.c** / **Particle Boron .ino** (URL or path pre-filled). Or copy a sketch from this folder and set `INGEST_URL` / `INGEST_PATH` yourself. Always set Wi-Fi credentials (ESP / Pico), `INGEST_HOST` / `INGEST_PATH` (Ethernet), or a Particle Console webhook (cellular) before flashing.

## Matrix

| Path | Sensor | Stack |
|------|--------|-------|
| [`arduino/ds18b20_ingest`](https://github.com/doodersrage/thermaltrace/tree/main/sketches/arduino/ds18b20_ingest) | DS18B20 (1-Wire) | Arduino: ESP32, ESP8266, Pico W (+ PlatformIO on ESP) |
| [`arduino/ds18b20_wifimanager`](https://github.com/doodersrage/thermaltrace/tree/main/sketches/arduino/ds18b20_wifimanager) | DS18B20 + WiFiManager | Arduino / ESP32 |
| [`arduino/ethernet_dht22_ingest`](https://github.com/doodersrage/thermaltrace/tree/main/sketches/arduino/ethernet_dht22_ingest) | Dual DHT22 + W5100 | Uno Ethernet (HTTP push + LAN pull) |
| [`arduino/max31855_ingest`](https://github.com/doodersrage/thermaltrace/tree/main/sketches/arduino/max31855_ingest) | MAX31855 thermocouple | Arduino: ESP32 / Pico W |
| [`arduino/max6675_ingest`](https://github.com/doodersrage/thermaltrace/tree/main/sketches/arduino/max6675_ingest) | MAX6675 thermocouple | Arduino: ESP32 / Pico W |
| [`micropython/ds18b20_ingest.py`](https://github.com/doodersrage/thermaltrace/blob/main/sketches/micropython/ds18b20_ingest.py) | DS18B20 | MicroPython ESP32 or Pico W |
| [`micropython/max31855_ingest.py`](https://github.com/doodersrage/thermaltrace/blob/main/sketches/micropython/max31855_ingest.py) | MAX31855 | MicroPython ESP32 |
| [`circuitpython/ds18b20_ingest.py`](https://github.com/doodersrage/thermaltrace/blob/main/sketches/circuitpython/ds18b20_ingest.py) | DS18B20 | CircuitPython Pico W / Pico 2 W |
| [`zephyr/ds18b20_ingest`](https://github.com/doodersrage/thermaltrace/tree/main/sketches/zephyr/ds18b20_ingest) | DS18B20 | Zephyr C / STM32 Nucleo-F767ZI |
| [`wch/ch32v307_ds18b20_ingest`](https://github.com/doodersrage/thermaltrace/tree/main/sketches/wch/ch32v307_ds18b20_ingest) | DS18B20 | WCHNET C / CH32V307V-EVT |
| [`avr/atmega328_w5100_ds18b20`](https://github.com/doodersrage/thermaltrace/tree/main/sketches/avr/atmega328_w5100_ds18b20) | DS18B20 | GNU AVR assembly / ATmega328P + W5100 |
| [`teensy/teensy41_ds18b20_ingest`](https://github.com/doodersrage/thermaltrace/tree/main/sketches/teensy/teensy41_ds18b20_ingest) | DS18B20 | Teensyduino + QNEthernet / Teensy 4.1 |
| [`microchip/pic18f67j60_ds18b20_ingest`](https://github.com/doodersrage/thermaltrace/tree/main/sketches/microchip/pic18f67j60_ds18b20_ingest) | DS18B20 | MPLAB X MLA TCP/IP / PIC18F67J60 |
| [`particle/boron_ds18b20_ingest`](https://github.com/doodersrage/thermaltrace/tree/main/sketches/particle/boron_ds18b20_ingest) | DS18B20 | Particle Boron LTE + Console webhook |

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

1. Buy ESP32 + waterproof DS18B20 — [parts list](https://thermaltrace.dev/about/esp32-freeze-kit) — or a [Pico W](https://thermaltrace.dev/about/pico-w-ingest) — or a [Nucleo-F767ZI](https://thermaltrace.dev/about/stm32-zephyr-ingest) — or a [CH32V307V-EVT](https://thermaltrace.dev/about/ch32v-riscv-ingest) — or [AVR assembly on Uno + W5100](https://thermaltrace.dev/about/avr-asm-ingest) — or [Teensy 4.1](https://thermaltrace.dev/about/teensy41-ingest) — or [PIC18F67J60](https://thermaltrace.dev/about/pic18-ethernet-ingest) — or [Particle Boron cellular](https://thermaltrace.dev/about/cellular-ingest)
2. Create push device on Devices; download pre-filled sketch (or paste `INGEST_URL`)
3. Edit `WIFI_*` only
4. Flash; watch serial (115200) for `POST 200`
5. Open Home on thermaltrace.dev
6. Set freeze alerts under Dashboard → Alerts

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

Wiring / LCD guides on the product site: [About → Arduino](https://thermaltrace.dev/about/arduino-sketches) · [Pico W ingest](https://thermaltrace.dev/about/pico-w-ingest) · [STM32 Zephyr](https://thermaltrace.dev/about/stm32-zephyr-ingest) · [CH32V RISC-V](https://thermaltrace.dev/about/ch32v-riscv-ingest) · [AVR assembly](https://thermaltrace.dev/about/avr-asm-ingest) · [Teensy 4.1](https://thermaltrace.dev/about/teensy41-ingest) · [PIC18 Ethernet](https://thermaltrace.dev/about/pic18-ethernet-ingest) · [Cellular](https://thermaltrace.dev/about/cellular-ingest)
