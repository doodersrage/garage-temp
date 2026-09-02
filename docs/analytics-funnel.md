# GA4 setup funnel (ThermalTrace)

Product events are sent client-side via `gtag` when `GA_MEASUREMENT_ID` is set and the user has not opted out of product analytics.

## Events to track

| Event | When fired |
|-------|------------|
| `demo_pull_started` | Example pull feed quick-start completes |
| `pull_setup_saved` | Pull feeds + probes saved |
| `device_created` | Push device created (flash key callout) |
| `first_ingest` | First live reading on Devices or Overview |
| `sensors_renamed` | Inline push sensor rename batch saved |
| `onboarding_step_complete` | Overview milestones (`devices`, `sensors`, `history`, `alerts`, `alert_test`) |
| `first_alert_test` | Test alert sent from Alerts |

## Recommended GA4 funnel

In **Admin → Explore → Funnel exploration**, create steps:

1. `demo_pull_started` **OR** `device_created` (use segment OR — two funnels if GA4 doesn't support OR in one funnel)
2. `first_ingest`
3. `pull_setup_saved` or `sensors_renamed` (rename step — optional)
4. `onboarding_step_complete` where `step = alerts`
5. `first_alert_test` or `onboarding_step_complete` where `step = alert_test`

### Push-only funnel

1. `device_created`
2. `first_ingest`
3. `sensors_renamed`
4. `first_alert_test`

### Pull-only / zero-hardware funnel

1. `demo_pull_started`
2. `pull_setup_saved`
3. `first_ingest`
4. `first_alert_test`

## Conversion markers

Mark these as **Key events** in GA4 if you use Google Ads or want them on the home report:

- `first_ingest` — core product activation
- `first_alert_test` — trust / retention signal

## Debugging

In development, events log to the console as `[product-analytics]` when `import.meta.env.DEV` is true.

Dashboard pages respect `product_analytics_opt_out` in user metadata.
