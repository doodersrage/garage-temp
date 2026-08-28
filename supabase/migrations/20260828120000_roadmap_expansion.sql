-- Roadmap expansion: alert channels, roles, playbooks, feed uptime, retention

-- New alert channels ---------------------------------------------------------------------------
alter table public.alert_settings
  add column if not exists channel_teams boolean not null default false;

alter table public.alert_settings
  add column if not exists teams_webhook_url text;

alter table public.alert_settings
  add column if not exists channel_ntfy boolean not null default false;

alter table public.alert_settings
  add column if not exists ntfy_topic text;

alter table public.alert_settings
  add column if not exists ntfy_server text not null default 'https://ntfy.sh';

alter table public.alert_settings
  add column if not exists channel_pushover boolean not null default false;

alter table public.alert_settings
  add column if not exists pushover_user_key text;

alter table public.alert_settings
  add column if not exists pushover_app_token text;

alter table public.alert_settings
  add column if not exists channel_whatsapp boolean not null default false;

alter table public.alert_settings
  add column if not exists whatsapp_phone text;

alter table public.alert_settings
  add column if not exists alert_playbooks jsonb not null default '[]'::jsonb;

alter table public.alert_settings
  add column if not exists data_retention_days integer;

alter table public.alert_settings
  add column if not exists feed_uptime_alerts_enabled boolean not null default false;

alter table public.alert_settings
  add column if not exists last_feed_uptime_alert_at timestamptz;

-- Household roles: alert_only (read-only), property_manager (devices/alerts, not billing) ------
alter table public.household_members
  drop constraint if exists household_members_role_check;

alter table public.household_members
  add constraint household_members_role_check
  check (role in ('owner', 'member', 'viewer', 'alert_only', 'property_manager'));

alter table public.household_invites
  drop constraint if exists household_invites_role_check;

alter table public.household_invites
  add constraint household_invites_role_check
  check (role in ('member', 'viewer', 'alert_only', 'property_manager'));

-- Feed uptime snapshots ------------------------------------------------------------------------
create table if not exists public.feed_uptime_checks (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  feed_id text not null,
  feed_name text not null,
  url text not null,
  ok boolean not null,
  message text,
  latency_ms integer,
  checked_at timestamptz not null default now()
);

create index if not exists feed_uptime_checks_user_checked_idx
  on public.feed_uptime_checks (user_id, checked_at desc);

alter table public.feed_uptime_checks enable row level security;

drop policy if exists feed_uptime_checks_own_select on public.feed_uptime_checks;
create policy feed_uptime_checks_own_select on public.feed_uptime_checks
  for select to authenticated
  using (user_id = auth.uid());

-- History archive metadata (R2 cold storage) ----------------------------------------------------
create table if not exists public.history_archives (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  object_key text not null,
  row_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists history_archives_household_idx
  on public.history_archives (household_id, period_start desc);

alter table public.history_archives enable row level security;

drop policy if exists history_archives_member_select on public.history_archives;
create policy history_archives_member_select on public.history_archives
  for select to authenticated
  using (public.is_household_member(household_id));

-- Status page email subscriptions --------------------------------------------------------------
create table if not exists public.status_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text not null unique,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists status_subscriptions_email_idx
  on public.status_subscriptions (email);

alter table public.status_subscriptions enable row level security;
-- Public subscribe via service role only.
