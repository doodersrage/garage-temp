alter table public.alert_settings
  add column if not exists runway_alert_enabled boolean not null default true,
  add column if not exists last_runway_alert_at timestamptz;

comment on column public.alert_settings.runway_alert_enabled is
  'Alert when indoor time-to-freeze projection hits the look-ahead window, before the probe crosses threshold.';
