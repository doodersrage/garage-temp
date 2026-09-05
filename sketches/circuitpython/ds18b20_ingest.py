"""
DS18B20 → ThermalTrace push ingest (CircuitPython).

Primary target: Raspberry Pi Pico W / Pico 2 W (RP2040 / RP2350).
Also runs on other CircuitPython boards with Wi‑Fi and a GP4, IO4, or D4 pin
(Adafruit Feather RP2040 with CYW43439, ESP32-S2/S3 CircuitPython, etc.).

1. Flash a CircuitPython UF2 for your board.
2. Install libraries on CIRCUITPY/lib (circup or the Adafruit bundle):
     circup install adafruit_requests adafruit_connection_manager \\
                    adafruit_ds18x20 adafruit_onewire
3. Set WIFI_SSID / WIFI_PASS below.
4. Copy this file to the board as code.py.
5. Serial should show wifi ok, then POST 200 …

Default: DS18B20 data on GP4 (4.7k pull-up to 3.3V) → temp1.
RP2040-Zero claim pucks are a different firmware path; this file is a temperature probe.
"""

import json
import time

import adafruit_connection_manager
import adafruit_ds18x20
import adafruit_requests
import board
import wifi
from adafruit_onewire.bus import OneWireBus

WIFI_SSID = "your-wifi"
WIFI_PASS = "your-password"
INGEST_URL = "https://thermaltrace.dev/api/ingest/YOUR_DEVICE_KEY"
INTERVAL_S = 60


def onewire_pin():
    for name in ("GP4", "IO4", "D4"):
        pin = getattr(board, name, None)
        if pin is not None:
            return pin
    raise RuntimeError("No GP4/IO4/D4 on this board — edit onewire_pin()")


def connect_wifi() -> None:
    if wifi.radio.connected:
        return
    print("wifi connecting")
    wifi.radio.connect(WIFI_SSID, WIFI_PASS)
    print("wifi ok", wifi.radio.ipv4_address)


def rssi() -> int:
    info = wifi.radio.ap_info
    if info is None:
        return 0
    return int(info.rssi)


def main() -> None:
    connect_wifi()
    pool = adafruit_connection_manager.get_radio_socketpool(wifi.radio)
    ssl_context = adafruit_connection_manager.get_radio_ssl_context(wifi.radio)
    http = adafruit_requests.Session(pool, ssl_context)

    ow_bus = OneWireBus(onewire_pin())
    devices = ow_bus.scan()
    if not devices:
        raise RuntimeError("No DS18B20 found")
    sensor = adafruit_ds18x20.DS18X20(ow_bus, devices[0])
    print("found", len(devices), "sensor(s)")

    while True:
        temp_f = sensor.temperature * 9.0 / 5.0 + 32.0
        body = json.dumps({"temp1": round(temp_f, 2), "rssi": rssi()})
        try:
            response = http.post(
                INGEST_URL,
                data=body,
                headers={"Content-Type": "application/json"},
            )
            print("POST", response.status_code, body)
            response.close()
        except OSError as exc:
            print("POST failed", exc)
            connect_wifi()
        time.sleep(INTERVAL_S)


if __name__ == "__main__":
    main()
