# Home Assistant

ThermalTrace does **not** run MQTT inside Cloudflare Workers. Prefer HTTPS for alerts, and the [MQTT bridge](/integrations/mqtt-bridge) when readings already live on Mosquitto:

1. Enable **outbound webhook** (Pro) in Dashboard → Alerts  
2. Point it at HA: `https://<ha-host>/api/webhook/<id>`  
3. Import the blueprint from the repo  

**Blueprint file:** [`public/ha/garage_temp_webhook.yaml`](https://github.com/doodersrage/thermaltrace/blob/main/public/ha/garage_temp_webhook.yaml)  
Also served at: [thermaltrace.dev/ha/garage_temp_webhook.yaml](https://thermaltrace.dev/ha/garage_temp_webhook.yaml)

## What the blueprint does

- Triggers on HA webhook POST  
- Creates a persistent notification with title/body/`kind`  
- Optionally republishes the JSON to an MQTT topic for local automations  

## Signature check

If you set a webhook secret in ThermalTrace, verify `X-Signature` (HMAC-SHA256 hex of the raw body) in a HA template or intermediate proxy before trusting the event.

## Inbound (HA → ThermalTrace)

Pro inbound tokens can snooze alerts, toggle vacation, or report status. See [HTTP API](/api/) `POST /api/inbound/{token}` and the product [ingest & webhooks](https://thermaltrace.dev/about/ingest-and-webhooks) guide.
