# Pull feeds

If your probe already serves HTTPS JSON (Arduino Ethernet server, FastAPI relay, etc.), use a **pull feed** instead of push ingest.

Product walkthrough (UI steps): [Adding push and pull devices](https://thermaltrace.dev/about/adding-devices).

## Setup

1. Open **[Dashboard → Devices](https://thermaltrace.dev/dashboard/temperature#pull-feeds)** → **Edit pull feeds**
2. Add an HTTPS URL and set **JSON root key** (default `temp`)
3. Click **Test feed URL**, then **Save feeds**
4. Under **Probe labels**, map keys inside that root (`0`, `1`, `avg`, …) to Home names → **Save probes**
5. ThermalTrace fetches every 15 minutes on cron and when you refresh live readings while signed in

## Expected shape

Pull feeds expect nested probe objects under the configured root—not flat push keys or `sensors[]`.

```json
{
  "temp": {
    "0": { "c": 18.5, "f": 65.3, "h": 42 },
    "1": { "c": 19.0, "f": 66.2, "h": 40 },
    "avg": { "f": 65.75, "c": 18.75, "h": 41 }
  },
  "battery_pct": 87,
  "rssi": -62
}
```

If probes live under another top-level key (for example `readings`), set **JSON root key** to that name. Optional top-level `battery_pct` / `rssi` (or nested `meta`) update device health.

## Relay pattern

When the MCU cannot do TLS:

```
[Probe HTTP] → [local FastAPI / nginx TLS] → [ThermalTrace pull URL]
```

See [python feeds](https://thermaltrace.dev/about/python-feeds) and the [fast-api-relay](https://github.com/doodersrage/fast-api-relay) repo.

## Push vs pull

| | Push | Pull |
|---|------|------|
| Who initiates | Your device | ThermalTrace |
| Firewall | Device needs outbound HTTPS | Feed URL must be publicly reachable |
| Auth | Per-device key in path | HTTPS URL |
| JSON shape | Flat keys, `temp` object, or `sensors[]` | Nested probes under configurable root (default `temp`) |
| Best for | ESP32 / battery nodes | Always-on LAN servers with a public tunnel or relay |

## Related

- [Push ingest](/ingest/)
- Product: [Adding devices](https://thermaltrace.dev/about/adding-devices) · [Configuring temperature feeds](https://thermaltrace.dev/about/configuring-temperature-feeds)
