# ThermalTrace developer docs

Static docs for firmware authors and integrators. The live product, dashboards, and long-form guides stay on **[thermaltrace.dev](https://thermaltrace.dev)**.

## What lives here

| Page | Contents |
|------|----------|
| [Push ingest](./ingest) | `POST /api/ingest/<key>` payloads |
| [HTTP API](./api) | OpenAPI download + endpoint quick reference |
| [Sensor sketches](./sketches) | Arduino / MicroPython samples in this repo |

## What lives on the app

- [About & guides](https://thermaltrace.dev/about) — journeys, wiring, freeze playbooks
- [In-app API docs](https://thermaltrace.dev/docs/api)
- [Dashboard](https://thermaltrace.dev/dashboard) — devices, alerts, history

## Quick start

1. Create an account on [thermaltrace.dev](https://thermaltrace.dev/register).
2. **Dashboard → Devices** → create a **push** device and save the one-time ingest key.
3. Flash a [sketch](./sketches) (or your own firmware) that POSTs JSON to:

```http
POST https://thermaltrace.dev/api/ingest/<device-key>
Content-Type: application/json
```

4. Open **Home** to confirm live readings, then set freeze alerts.
