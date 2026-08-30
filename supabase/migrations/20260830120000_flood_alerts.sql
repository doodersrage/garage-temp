alter table alert_settings
  add column if not exists last_flood_alert_at timestamptz;
