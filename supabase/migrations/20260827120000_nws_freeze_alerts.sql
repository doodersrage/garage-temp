alter table alert_settings
  add column if not exists nws_freeze_alerts_enabled boolean not null default false,
  add column if not exists last_nws_alert_at timestamptz;
