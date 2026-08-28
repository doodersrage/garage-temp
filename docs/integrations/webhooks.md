# Alert webhooks

Pro accounts can enable an **outbound webhook** under Dashboard → Alerts. Each alert POSTs JSON:

```json
{
  "title": "Garage temperature alert",
  "body": "Probe 1 is 31.2°F …",
  "kind": "threshold",
  "sent_at": "2026-08-25T12:00:00.000Z"
}
```

`kind` may be `threshold`, `rate`, `outage`, `forecast`, `rule`, `digest`, or `generic`.

## HMAC verification

When a webhook secret is configured, requests include:

```http
X-Signature: <hex HMAC-SHA256 of raw body>
```

Verify before acting on the payload (Home Assistant, Zapier code step, custom worker).

## Reading webhooks

Separately, Pro can POST **reading** payloads to a URL for every stored snapshot (high volume — use carefully).

## Zapier / Make

Use **Webhooks by Zapier → Catch Hook** as the outbound URL, or call ThermalTrace **inbound** webhooks from a Zap. Product recipes: [Zapier & Make](https://thermaltrace.dev/about/zapier-make-recipes).

## Channels beyond webhooks

Email, Discord, Telegram, Slack, Teams, ntfy, Pushover on Free+; SMS / WhatsApp / browser push on Pro when configured.
