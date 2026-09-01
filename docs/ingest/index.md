# Push ingest

Create a **push** device under **[Dashboard → Devices](https://thermaltrace.dev/dashboard/temperature)** on the live app. You receive a **one-time** device key — store it in firmware; you will not see the full key again.

Full UI walkthrough (push **and** pull): [Adding push and pull devices](https://thermaltrace.dev/about/adding-devices).

```http
POST https://thermaltrace.dev/api/ingest/<device-key>
Content-Type: application/json
```

Optional top-level health fields (any payload style):

| Field | Meaning |
|-------|---------|
| `battery` / `battery_pct` | Battery percent (0–100) |
| `rssi` | Wi-Fi / radio RSSI (dBm) |

## Map sensors on Devices

Before readings appear as labeled cards on Home:

1. Prefer **Quick add: temperature + humidity pair** for DHT-style probes (same JSON key for temp and humidity)
2. Or **Add one sensor** for doors, floods, air quality, etc.
3. Keys must match the JSON you POST; calibration offset is under **Advanced** on each sensor

After the first successful POST, open **[Home](https://thermaltrace.dev/)** while signed in to confirm live values. History snapshots collect from Home refreshes and the **15-minute** background poll.

## Home Assistant

REST sensors, MQTT bridge, and inbound webhook examples: [Home Assistant integration](/ingest/home-assistant).

**Product page:** [thermaltrace.dev/integrations/home-assistant](https://thermaltrace.dev/integrations/home-assistant) · **HACS:** [github.com/doodersrage/thermaltrace-home-assistant](https://github.com/doodersrage/thermaltrace-home-assistant)

## curl smoke test

```bash
curl -X POST "https://thermaltrace.dev/api/ingest/YOUR_DEVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"temp1": 42.5, "door1": false, "battery": 87, "rssi": -62}'
```

Expect HTTP `200` when the key is valid. Map `temp1` / `door1` as sensor keys on the Devices page so labels show correctly (see **Map sensors on Devices** above).

## Payload styles

### Flat keys

Simplest for ESP sketches. Keys must match what you configure under the device’s sensors.

```json
{
  "temp1": 42.5,
  "humidity1": 41,
  "door1": true,
  "rssi": -62
}
```

### Classic Arduino `temp` object

Matches the Ethernet garage firmware JSON shape:

```json
{
  "temp": {
    "0": { "c": 18.5, "f": 65.3, "h": 42 },
    "1": { "c": 19.0, "f": 66.2, "h": 40 },
    "avg": { "f": 37.5, "c": 3.1, "h": 42.2 }
  },
  "battery": 87,
  "rssi": -62
}
```

### Typed `sensors[]`

```json
{
  "sensors": [
    { "key": "garage_temp", "kind": "temperature", "value": 65.3, "unit": "F" },
    { "key": "garage_rh", "kind": "humidity", "value": 42, "unit": "%" },
    { "key": "door1", "kind": "door", "bool": true },
    { "key": "co2", "kind": "co2", "value": 820, "unit": "ppm" },
    { "key": "pm25", "kind": "pm25", "value": 12, "unit": "µg/m³" },
    { "key": "sump", "kind": "level", "value": 22, "unit": "%" }
  ],
  "battery": 87,
  "rssi": -62
}
```

Supported `kind` values: `temperature`, `humidity`, `co2`, `pressure`, `pm25`, `voc`, `level`, `energy`, `door`, `power`, `flood`, `motion`, `generic`.

## MQTT-over-HTTP bridge

Cloudflare Workers are not an MQTT broker. Keep Mosquitto / Home Assistant MQTT on your LAN and mirror readings with:

```http
POST https://thermaltrace.dev/api/ingest/mqtt
X-Ingest-Key: <device-key>
Content-Type: application/json
```

Body may include `topic`, `payload` (JSON string), or `message` (object). The Worker unwraps and forwards into the same ingest path.

Recipes (Home Assistant + Node-RED import): [MQTT bridge](/integrations/mqtt-bridge). Product page: [Adding devices § MQTT](https://thermaltrace.dev/about/adding-devices#mqtt-bridge).

## Common mistakes

| Symptom | Check |
|---------|--------|
| `401` | Wrong or rotated device key |
| Readings missing on Home | Sensor **keys** on Devices don’t match JSON keys |
| No history | Need successful ingest **and** signed-in Home / 15-minute poll |
| TLS failures on MCU | Use a local HTTPS relay ([python feeds](https://thermaltrace.dev/about/python-feeds)) |

## Related

- [Sensor sketches](/sketches/)
- [Pull feeds](/ingest/pull-feeds) (alternative to push)
- [Home Assistant](/ingest/home-assistant)
- Product: [Adding devices](https://thermaltrace.dev/about/adding-devices) · [ingest & webhooks](https://thermaltrace.dev/about/ingest-and-webhooks)
