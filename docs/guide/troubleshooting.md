# Troubleshooting

## Ingest returns 401

- Key typo or old key after **rotate**
- Extra whitespace in firmware URL
- Posting to the wrong host (`workers.dev` vs `thermaltrace.dev`) — prefer the apex

## Device online but Home is empty

1. Devices → confirm **sensor keys** match JSON (`temp1` vs `temp.0`)  
2. Hard-refresh Home while signed into the same household  
3. Check Ops / system status if you admin the project  

## Alerts not arriving

- Dashboard → Alerts: enabled? freeze threshold set? channel toggled?  
- Quiet hours / vacation / snooze  
- Email: confirm address; SMS needs Pro + Twilio secrets  
- Webhook: HTTPS URL reachable; verify HMAC if secret set  

## CSV export 403

Member/Pro (or admin) required. Free accounts see an upgrade nudge instead.

## GitHub Pages 404 on `/thermaltrace/`

Site is published at the **project** base path:

`https://doodersrage.github.io/thermaltrace/`

Not at `https://doodersrage.github.io/` (user site).

## Manual cron returns 401

`POST /api/cron/collect-history` requires `Authorization: Bearer $CRON_SECRET`. The path is rate-limited per IP. Do not commit the secret.

## Still stuck

- [System status](https://thermaltrace.dev/system-status)  
- [Contact](https://thermaltrace.dev/contact)  
- [Open an issue](https://github.com/doodersrage/thermaltrace/issues)
