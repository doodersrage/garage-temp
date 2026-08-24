# Garage Temperature Monitor

Live garage temperature and humidity monitoring built with Astro, Cloudflare Workers, Supabase, and Stripe.

## Features

- Live JSON feed readings on the home page with OpenWeather comparison
- Signed-in dashboard for feeds, probe labels, display preferences, and history
- Historic readings table with 7-day chart and feed/probe filters
- CSV export for subscribers (Stripe)
- Threshold email alerts (freeze / humidity)
- Hourly background history collection via cron endpoint
- Rich about/docs hub with search, case study, and interactive probe demo
- Contact form with Cloudflare Email + Turnstile verification

## Stack

- **Frontend:** Astro 6, Preact islands, Tailwind CSS v4
- **Deploy:** Cloudflare Workers (`@astrojs/cloudflare`)
- **Auth & DB:** Supabase (Auth, Postgres)
- **Billing:** Stripe subscriptions
- **Email:** Cloudflare Email binding

## Development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:4321`.

## Environment variables

Configure in `.env` (local) and Cloudflare secrets (production):

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase access |
| `GARAGE_TEMP_FEED_URL` | Default public probe JSON feed |
| `NEXT_PUBLIC_OPENWEATHER_API_KEY` | OpenWeather API key |
| `NEXT_PUBLIC_OPENWEATHER_CITY_ID` | Default city ID |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_TOKEN` | Cloudflare Turnstile |
| `SMTP_MAIL_FROM` / `SMTP_MAIL_TO` | Contact + alert email |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe billing |
| `CRON_SECRET` | Bearer token for `/api/cron/collect-history` |

## Background history collection

Set `CRON_SECRET` and configure an hourly trigger to call:

```bash
curl -X POST https://your-domain/api/cron/collect-history \
  -H "Authorization: Bearer $CRON_SECRET"
```

`wrangler.jsonc` includes an hourly cron trigger — wire it to this endpoint in your deployment pipeline or a Cloudflare scheduled worker wrapper.

## Deploy

```bash
pnpm build
pnpm deploy
```

## Open-source firmware & relays

- [arduino-network-json-temperature-sever](https://github.com/doodersrage/arduino-network-json-temperature-sever)
- [garage-temp](https://github.com/doodersrage/garage-temp) (this site)
- [fast-api-relay](https://github.com/doodersrage/fast-api-relay)
