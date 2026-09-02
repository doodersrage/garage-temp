# HTTP API

Machine-readable contract:

- **This docs site:** [openapi.yaml](/openapi.yaml)
- **Production:** [thermaltrace.dev/openapi.yaml](https://thermaltrace.dev/openapi.yaml)
- **In-app page:** [thermaltrace.dev/docs/api](https://thermaltrace.dev/docs/api)

## Authentication

| Audience | Mechanism |
|----------|-----------|
| Device firmware | Device key in `/api/ingest/{deviceKey}` (or `X-Ingest-Key` for MQTT bridge) |
| Pro integrations | Bearer **API key** from Dashboard → Share |
| Browser dashboard | Supabase session cookies (not for third-party clients) |
| Share links | Opaque token in the URL path |

## Endpoint map

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/ingest/{deviceKey}` | Path key | Push sensor readings |
| `POST` | `/api/ingest/mqtt` | `X-Ingest-Key` | MQTT→HTTP bridge |
| `POST` | `/api/user/pull-setup` | Session cookie | Save pull feeds + probe labels (JSON body) |
| `POST` | `/api/devices/reveal-ingest-key` | Session cookie | Recover encrypted push ingest key (rate-limited; audited) |
| `GET` | `/api/v1/metrics` | Bearer API key | Prometheus text exposition |
| `GET` | `/api/v1/devices` | Bearer API key | List household devices |
| `POST` | `/api/v1/devices` | Bearer API key | Create push device |
| `POST` | `/api/inbound/{token}` | Token (+ optional HMAC) | Snooze / vacation / status actions |
| `GET` | `/api/share/{token}/readings` | Share token | Public JSON readings (Free family live; Pro expands scopes) |

## Create an API key (Pro)

1. Sign in → **Dashboard → Share**  
2. Create an API key; copy it once  
3. Call:

```bash
curl -sS "https://thermaltrace.dev/api/v1/metrics" \
  -H "Authorization: Bearer YOUR_API_KEY" | head
```

## Example: list devices

```bash
curl -sS "https://thermaltrace.dev/api/v1/devices" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Spec versioning

`openapi.yaml` in the repo (`public/openapi.yaml`) is the source of truth. The docs build copies it into this site on every Pages deploy.

Legacy per-feed routes (`/api/user/temp-feeds`, `/api/user/temp-probes`) are retired — use **`POST /api/user/pull-setup`** instead.
