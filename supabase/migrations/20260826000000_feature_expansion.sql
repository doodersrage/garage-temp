-- Feature expansion: forecast/quiet hours/rules channels, alert audit, freeze map, metrics share, device meta

-- alert_settings expansions --------------------------------------------------
alter table public.alert_settings
  add column if not exists forecast_freeze_enabled boolean not null default false;

alter table public.alert_settings
  add column if not exists forecast_hours_ahead double precision not null default 12;

alter table public.alert_settings
  add column if not exists last_forecast_alert_at timestamptz;

alter table public.alert_settings
  add column if not exists quiet_hours_enabled boolean not null default false;

alter table public.alert_settings
  add column if not exists quiet_hours_start text not null default '22:00';

alter table public.alert_settings
  add column if not exists quiet_hours_end text not null default '07:00';

alter table public.alert_settings
  add column if not exists quiet_hours_timezone text not null default 'America/New_York';

alter table public.alert_settings
  add column if not exists quiet_hours_bypass_freeze boolean not null default true;

alter table public.alert_settings
  add column if not exists channel_telegram boolean not null default false;

alter table public.alert_settings
  add column if not exists telegram_bot_token text;

alter table public.alert_settings
  add column if not exists telegram_chat_id text;

alter table public.alert_settings
  add column if not exists channel_slack boolean not null default false;

alter table public.alert_settings
  add column if not exists slack_webhook_url text;

alter table public.alert_settings
  add column if not exists alert_rules jsonb not null default '[]'::jsonb;

alter table public.alert_settings
  add column if not exists channel_severity jsonb not null default '{}'::jsonb;

-- alert_events audit ---------------------------------------------------------
create table if not exists public.alert_events (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  channels_sent text[] not null default '{}',
  channels_skipped text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists alert_events_user_created_idx
  on public.alert_events (user_id, created_at desc);

alter table public.alert_events enable row level security;

drop policy if exists alert_events_own_select on public.alert_events;
create policy alert_events_own_select on public.alert_events
  for select to authenticated
  using (user_id = auth.uid());

-- households freeze map opt-in -----------------------------------------------
alter table public.households
  add column if not exists freeze_map_opt_in boolean not null default false;

alter table public.households
  add column if not exists freeze_map_city_id text;

-- freeze map snapshots (city-level aggregates, no PII) -----------------------
create table if not exists public.freeze_map_snapshots (
  id bigserial primary key,
  city_id text not null,
  city_label text not null,
  sample_count integer not null default 0,
  avg_temp_f double precision,
  min_temp_f double precision,
  freeze_risk_count integer not null default 0,
  captured_at timestamptz not null default now()
);

create index if not exists freeze_map_snapshots_captured_idx
  on public.freeze_map_snapshots (captured_at desc);

create index if not exists freeze_map_snapshots_city_captured_idx
  on public.freeze_map_snapshots (city_id, captured_at desc);

alter table public.freeze_map_snapshots enable row level security;
-- Public reads go through service role / server pages only (no anon policy).

-- share_links metrics scope --------------------------------------------------
alter table public.share_links drop constraint if exists share_links_scope_check;
alter table public.share_links
  add constraint share_links_scope_check
  check (scope in ('live', 'history', 'metrics'));

-- device meta for battery / rssi ---------------------------------------------
alter table public.devices
  add column if not exists meta jsonb not null default '{}'::jsonb;
