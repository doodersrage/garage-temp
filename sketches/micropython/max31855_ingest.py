"""
MAX31855 thermocouple → ThermalTrace push ingest (MicroPython / ESP32).

Bit-bangs the MAX31855 SPI-ish protocol (read 32-bit frame).
Adjust CS / SCK / MISO pins for your wiring.
"""

import json
import time

import network
import urequests
from machine import Pin

WIFI_SSID = "your-wifi"
WIFI_PASS = "your-password"
INGEST_URL = "https://thermaltrace.dev/api/ingest/YOUR_DEVICE_KEY"
PIN_CS = 5
PIN_SCK = 18
PIN_MISO = 19
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
    return wlan


def read_max31855_c(cs: Pin, sck: Pin, miso: Pin) -> float:
    cs.value(0)
    value = 0
    for _ in range(32):
        sck.value(1)
        value = (value << 1) | miso.value()
        sck.value(0)
    cs.value(1)
    if value & 0x7:
        raise OSError("thermocouple fault")
    # signed 14-bit thermocouple temperature in bits 31..18
    raw = value >> 18
    if raw & 0x2000:
        raw -= 0x4000
    return raw * 0.25


def post(temp_f: float) -> None:
    body = json.dumps(
        {
            "sensors": [
                {
                    "key": "tc1",
                    "kind": "temperature",
                    "value": round(temp_f, 2),
                    "unit": "F",
                }
            ]
        }
    )
    try:
        r = urequests.post(
            INGEST_URL,
            data=body,
            headers={"Content-Type": "application/json"},
        )
        print("POST", r.status_code)
        r.close()
    except OSError as exc:
        print("POST failed", exc)


def main() -> None:
    connect_wifi()
    cs = Pin(PIN_CS, Pin.OUT, value=1)
    sck = Pin(PIN_SCK, Pin.OUT, value=0)
    miso = Pin(PIN_MISO, Pin.IN)
    while True:
        try:
            c = read_max31855_c(cs, sck, miso)
            post(c * 9.0 / 5.0 + 32.0)
        except OSError as exc:
            print(exc)
        time.sleep(INTERVAL_S)


if __name__ == "__main__":
    main()
