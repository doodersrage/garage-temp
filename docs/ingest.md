# Push ingest

Create a push device under **Dashboard → Devices** on [thermaltrace.dev](https://thermaltrace.dev/dashboard/temperature). You get a one-time device key.

```http
POST https://thermaltrace.dev/api/ingest/<device-key>
Content-Type: application/json
```

Optional top-level fields: `battery` / `battery_pct`, `rssi`.

## Classic Arduino JSON

```json
{
  "temp": {
    "0": { "c": 18.5, "f": 65.3, "h": 42 },
    "1": { "c": 19.0, "f": 66.2, "h": 40 }
  }
}
```

## Flat keys

```json
{
  "temp1": 42.5,
  "door1": true,
  "rssi": -62
}
```

Map `temp1` / `door1` as sensor keys on the Devices page.

## Typed multi-sensor payload

```json
{
  "sensors": [
    { "key": "garage_temp", "kind": "temperature", "value": 65.3, "unit": "F" },
    { "key": "garage_rh", "kind": "humidity", "value": 42, "unit": "%" },
    { "key": "door1", "kind": "door", "bool": true },
    { "key": "co2", "kind": "co2", "value": 820, "unit": "ppm" }
  ],
  "battery": 87,
  "rssi": -62
}
```

Supported `kind` values: `temperature`, `humidity`, `co2`, `door`, `power`, `flood`, `generic`.

## MQTT bridge

`POST /api/ingest/mqtt` with header `X-Ingest-Key: <device-key>` forwards a bridge payload into the same ingest path. See the [OpenAPI](./api) file.

## Longer guide

Product-site write-up (with Home Assistant / webhooks):  
[thermaltrace.dev/about/ingest-and-webhooks](https://thermaltrace.dev/about/ingest-and-webhooks)
