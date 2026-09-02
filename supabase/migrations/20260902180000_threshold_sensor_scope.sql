alter table public.alert_settings
  add column if not exists threshold_sensor_scope jsonb not null default '{}'::jsonb;
