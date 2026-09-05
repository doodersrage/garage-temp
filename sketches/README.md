# ThermalTrace sensor sketches

Sample firmware that POSTs readings to your push-device ingest URL:

```http
POST https://thermaltrace.dev/api/ingest/<device-key>
Content-Type: application/json
```

Create a push device under **Dashboard → Devices**, then use **Download Arduino .ino** / **MicroPython .py** / **CircuitPython code.py** / **Zephyr main.c** / **CH32V main.c** / **AVR main.S** / **Teensy 4.1 .ino** / **PIC18 main.c** / **Particle Boron .ino** on the ingest callout (URL or path pre-filled). Or copy the key manually into a sketch from this folder (`INGEST_URL` or `INGEST_PATH`). Use **Reveal ingest key** on the device card if you lose it later (when key recovery is enabled on the server).

Payload examples match `/about/ingest-and-webhooks` and `/docs/api`.

| Sketch | Sensor | Runtime |
|--------|--------|---------|
| [`arduino/ds18b20_ingest`](arduino/ds18b20_ingest/) | DS18B20 (1-Wire) · GPIO4 / GP4 → `temp1` | Arduino: ESP32, ESP8266, Pico W |
| [`arduino/ds18b20_wifimanager`](arduino/ds18b20_wifimanager/) | DS18B20 + captive-portal Wi‑Fi | Arduino / ESP32 |
| [`arduino/ethernet_dht22_ingest`](arduino/ethernet_dht22_ingest/) | Dual DHT22 on A4/A5 · W5100 Ethernet | Arduino Uno + LAN shield (HTTP push + optional pull) |
| [`arduino/door_contact_ingest`](arduino/door_contact_ingest/) | Door reed · GPIO4 → `door1` | Arduino / ESP32 |
| [`arduino/leak_contact_ingest`](arduino/leak_contact_ingest/) | Leak pads · GPIO4 → `leak1` | Arduino / ESP32 |
| [`arduino/power_sense_ingest`](arduino/power_sense_ingest/) | Mains/USB sense · GPIO4 → `power1` | Arduino / ESP32 |
| [`arduino/max31855_ingest`](arduino/max31855_ingest/) | MAX31855 thermocouple amp | Arduino: ESP32 / Pico W |
| [`arduino/max6675_ingest`](arduino/max6675_ingest/) | MAX6675 thermocouple amp | Arduino: ESP32 / Pico W |
| [`micropython/ds18b20_ingest.py`](micropython/ds18b20_ingest.py) | DS18B20 | MicroPython (ESP32 or Pico W) |
| [`micropython/max31855_ingest.py`](micropython/max31855_ingest.py) | MAX31855 | MicroPython (ESP32) |
| [`circuitpython/ds18b20_ingest.py`](circuitpython/ds18b20_ingest.py) | DS18B20 · GP4 → `temp1` | CircuitPython (Pico W / Pico 2 W) |
| [`zephyr/ds18b20_ingest`](zephyr/ds18b20_ingest/) | DS18B20 · Arduino D4 / PF14 → `temp1` | Zephyr C / STM32 Nucleo-F767ZI |
| [`wch/ch32v307_ds18b20_ingest`](wch/ch32v307_ds18b20_ingest/) | DS18B20 · PB12 → `temp1` | WCHNET C / CH32V307V-EVT |
| [`avr/atmega328_w5100_ds18b20`](avr/atmega328_w5100_ds18b20/) | DS18B20 · D7 → `temp1` | GNU AVR assembly / ATmega328P + W5100 |
| [`teensy/teensy41_ds18b20_ingest`](teensy/teensy41_ds18b20_ingest/) | DS18B20 · pin 4 → `temp1` | Teensyduino + QNEthernet / Teensy 4.1 |
| [`microchip/pic18f67j60_ds18b20_ingest`](microchip/pic18f67j60_ds18b20_ingest/) | DS18B20 · RD0 → `temp1` | MPLAB X MLA TCP/IP / PIC18F67J60 |
| [`particle/boron_ds18b20_ingest`](particle/boron_ds18b20_ingest/) | DS18B20 · D2 → `temp1` | Particle Boron LTE + Console webhook |

**ESP32 flash checklist:** board package (ESP32, not Uno Ethernet samples) → libraries `OneWire` + `DallasTemperature` → set Wi‑Fi → Serial **115200** → expect `POST 200`. Full options (IDE, PlatformIO, MicroPython, esptool-js): [thermaltrace.dev/about/esp32-web-flash](https://thermaltrace.dev/about/esp32-web-flash).

**Pico W / Pico 2 W:** CircuitPython `code.py` (drag-and-drop `CIRCUITPY` drive), or the same MicroPython / Arduino DS18B20 sketch with Earle Philhower’s Pico core. DS18B20 on **GP4**, 4.7k pull-up to 3.3V. Guide: [thermaltrace.dev/about/pico-w-ingest](https://thermaltrace.dev/about/pico-w-ingest). The RP2040-Zero [claim puck](https://thermaltrace.dev/claim-puck) is a different firmware path (USB presence, not ingest).

**STM32 Nucleo-F767ZI (Zephyr C):** onboard Ethernet, ST-LINK, not Arduino and not Python. DS18B20 on Arduino **D4** (PF14). HTTP to the same LAN TLS relay as the Uno shield. Guide: [thermaltrace.dev/about/stm32-zephyr-ingest](https://thermaltrace.dev/about/stm32-zephyr-ingest).

**CH32V307V-EVT (WCHNET C):** QingKe RISC-V, onboard 10M Ethernet, MounRiver Studio. Drop `src/main.c` over the official EVT `ETH/DHCP` `User/main.c`. DS18B20 on **PB12**. Same LAN TLS relay. Guide: [thermaltrace.dev/about/ch32v-riscv-ingest](https://thermaltrace.dev/about/ch32v-riscv-ingest).

**ATmega328P + W5100 (GNU AVR assembly):** no Arduino C. DS18B20 on **D7** (D4 is SD CS on the Ethernet shield). Same LAN TLS relay. Guide: [thermaltrace.dev/about/avr-asm-ingest](https://thermaltrace.dev/about/avr-asm-ingest).

**Teensy 4.1 (QNEthernet):** Ethernet kit MagJack, DS18B20 on **pin 4**. Same LAN TLS relay. Guide: [thermaltrace.dev/about/teensy41-ingest](https://thermaltrace.dev/about/teensy41-ingest).

**PIC18F67J60 (MLA TCP/IP):** MPLAB X + XC8 drop-in on the classic Microchip Ethernet demo. DS18B20 on **RD0**. Same LAN TLS relay. Guide: [thermaltrace.dev/about/pic18-ethernet-ingest](https://thermaltrace.dev/about/pic18-ethernet-ingest).

**Particle Boron (cellular):** LTE + Console webhook to HTTPS ingest. DS18B20 on **D2**. Stale-probe detection covers dropouts. Guide: [thermaltrace.dev/about/cellular-ingest](https://thermaltrace.dev/about/cellular-ingest).

**Accessories (not freeze probes):** [door](https://thermaltrace.dev/door-puck) / [leak](https://thermaltrace.dev/leak-puck) / [power](https://thermaltrace.dev/power-nudge) contact sketches above; [alert beacon](https://thermaltrace.dev/alert-beacon), [kit labels](https://thermaltrace.dev/kit-labels), [probe mount kit](https://thermaltrace.dev/probe-mount-kit), [claim puck case](https://thermaltrace.dev/claim-puck-case). Hub: [thermaltrace.dev/accessories](https://thermaltrace.dev/accessories).

**Uno + Ethernet shield:** W5100 cannot TLS. Use [`ethernet_dht22_ingest`](arduino/ethernet_dht22_ingest/) (classic `temp` JSON, DHT22 on A4/A5) plus [`relay/push_https_forward.py`](relay/push_https_forward.py) on a LAN host so POSTs reach `https://thermaltrace.dev`. The same sketch can serve pull JSON on port 80.

Replace Wi-Fi credentials (ESP / Pico) or `INGEST_HOST` / `INGEST_PATH` (Ethernet) before flashing. Prefer HTTPS when your board stack supports TLS; otherwise use the LAN relay. Cellular uses a Particle webhook instead of on-device TLS.
