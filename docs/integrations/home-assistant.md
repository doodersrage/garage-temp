# Home Assistant

ThermalTrace ships an **official [HACS custom integration](https://github.com/doodersrage/thermaltrace-home-assistant)**. Product landing page: [thermaltrace.dev/integrations/home-assistant](https://thermaltrace.dev/integrations/home-assistant).

## HACS (recommended)

1. HACS → Integrations → Custom repositories → add `https://github.com/doodersrage/thermaltrace-home-assistant`
2. Install **ThermalTrace** and restart Home Assistant
3. Create a **readings** share link (Pro) under Dashboard → Share
4. Add integration → paste share token from `/share/YOUR_TOKEN`

Creates sensors and binary sensors automatically. Optional inbound webhook token + secret enable `thermaltrace.snooze`, `vacation`, `status`, etc. Optional ingest key enables `thermaltrace.push`.

Manual recipes (REST sensor, MQTT bridge) remain in [ingest/home-assistant](/ingest/home-assistant).

## Outbound alerts (ThermalTrace → HA)

ThermalTrace does **not** run MQTT inside Cloudflare Workers. For **alerts into HA**, use the outbound HTTPS webhook (Pro):

1. Enable **outbound webhook** in Dashboard → Alerts / Share  
2. Point it at HA: `https://<ha-host>/api/webhook/<id>`  
3. Import the blueprint from the repo  

**Blueprint:** [`public/ha/garage_temp_webhook.yaml`](https://github.com/doodersrage/thermaltrace/blob/main/public/ha/garage_temp_webhook.yaml)  
Also: [thermaltrace.dev/ha/garage_temp_webhook.yaml](https://thermaltrace.dev/ha/garage_temp_webhook.yaml)

### What the blueprint does

- Triggers on HA webhook POST  
- Creates a persistent notification with title/body/`kind`  
- Optionally republishes the JSON to an MQTT topic for local automations  

### Signature check

If you set a webhook secret in ThermalTrace, verify `X-Signature` (HMAC-SHA256 hex of the raw body) in a HA template or intermediate proxy before trusting the event.

## Inbound (HA → ThermalTrace)

Pro inbound tokens can snooze alerts, toggle vacation, or report status. The HACS integration wraps `POST /api/inbound/{token}` with signing. See also [HTTP API](/api/) and [ingest/home-assistant](/ingest/home-assistant).

## MQTT bridge

Keep Mosquitto on your LAN — mirror readings with [MQTT bridge](/integrations/mqtt-bridge).

## Related

- [HACS repo](https://github.com/doodersrage/thermaltrace-home-assistant)
- [Ingest HA guide](/ingest/home-assistant)
- [Alert webhooks](/integrations/webhooks)
- [vs DIY MQTT](https://thermaltrace.dev/compare/diy-mqtt)
