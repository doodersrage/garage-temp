# HTTP API

Programmatic surface for ThermalTrace. Full machine-readable spec:

**[Download openapi.yaml](/thermaltrace/openapi.yaml)** · also served at [thermaltrace.dev/openapi.yaml](https://thermaltrace.dev/openapi.yaml)

In-app page: [thermaltrace.dev/docs/api](https://thermaltrace.dev/docs/api)

## Quick reference

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| `POST` | `/api/ingest/{deviceKey}` | Device key in path | Push readings from ESP/Arduino |
| `POST` | `/api/ingest/mqtt` | `X-Ingest-Key` | MQTT-over-HTTP bridge |
| `GET` | `/api/v1/metrics` | Bearer API key (Pro) | Prometheus scrape |
| `GET`/`POST` | `/api/v1/devices` | Bearer API key (Pro) | List / create devices |
| `POST` | `/api/inbound/{token}` | Token (+ optional HMAC) | HA / Zapier actions |
| `GET` | `/api/share/{token}/readings` | Share token | Public JSON (Pro) |

Dashboard routes use Supabase session cookies and are not listed for third-party clients.

## API keys

Pro plans: **Dashboard → Share** → create an API key for metrics and device CRUD.
