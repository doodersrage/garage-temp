-- Follow-up: playbook execution state and portfolio freeze alerts

alter table public.alert_settings
  add column if not exists playbook_fired jsonb not null default '{}'::jsonb;

alter table public.alert_settings
  add column if not exists portfolio_alerts_enabled boolean not null default true;

alter table public.alert_settings
  add column if not exists last_portfolio_alert_at timestamptz;
