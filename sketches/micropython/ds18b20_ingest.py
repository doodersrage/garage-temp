"""
DS18B20 → ThermalTrace push ingest (MicroPython).

Works on ESP32 / ESP8266 and Raspberry Pi Pico W / Pico 2 W.
Copy to the board as main.py (or import from boot). Set WIFI and INGEST_URL.
Requires onewire + ds18x20 modules (usually bundled with MicroPython).

Default: DS18B20 on GPIO4 / GP4 → temp1. 4.7k pull-up to 3.3V.
"""

import json
import time

import ds18x20
import network
import onewire
from machine import Pin

try:
    import urequests as requests
except ImportError:
    import requests

WIFI_SSID = "your-wifi"
WIFI_PASS = "your-password"
INGEST_URL = "https://thermaltrace.dev/api/ingest/YOUR_DEVICE_KEY"
ONE_WIRE_PIN = 4
INTERVAL_S = 60


def connect_wifi() -> network.WLAN:
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        wlan.connect(WIFI_SSID, WIFI_PASS)
        for _ in range(40):
            if wlan.isconnected():
                break
            time.sleep(0.5)
    print("wifi", wlan.ifconfig())
    return wlan


def read_temp_f(ds: ds18x20.DS18X20, rom) -> float:
    ds.convert_temp()
    time.sleep_ms(750)
    c = ds.read_temp(rom)
    return c * 9.0 / 5.0 + 32.0


def wifi_rssi(wlan: network.WLAN) -> int:
    try:
        return int(wlan.status("rssi"))
    except (TypeError, ValueError, OSError):
        return 0


def post(temp_f: float, rssi: int) -> None:
    body = json.dumps({"temp1": round(temp_f, 2), "rssi": rssi})
    try:
        r = requests.post(
            INGEST_URL,
            data=body,
            headers={"Content-Type": "application/json"},
        )
        print("POST", r.status_code, body)
        r.close()
    except OSError as exc:
        print("POST failed", exc)


def main() -> None:
    wlan = connect_wifi()
    ds = ds18x20.DS18X20(onewire.OneWire(Pin(ONE_WIRE_PIN)))
    roms = ds.scan()
    if not roms:
        raise SystemExit("No DS18B20 found")
    print("found", len(roms), "sensor(s)")
    while True:
        temp_f = read_temp_f(ds, roms[0])
        post(temp_f, wifi_rssi(wlan))
        time.sleep(INTERVAL_S)


if __name__ == "__main__":
    main()
