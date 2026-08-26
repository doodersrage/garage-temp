-- Expansion pack 4: viewer polish, audit, escalation, status pages, multi-property, ingest stats

-- Allow users to own more than one household (vacation home, etc.)
drop index if exists public.household_members_one_owner_per_user_idx;

-- household activity audit -------------------------------------------------------------------
create table if not exists public.household_activity (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists household_activity_household_id_idx
  on public.household_activity (household_id, created_at desc);

alter table public.household_activity enable row level security;

drop policy if exists household_activity_member_select on public.household_activity;
create policy household_activity_member_select on public.household_activity
  for select to authenticated
  using (public.is_household_member(household_id));

-- Public read-only status pages (Pro) ------------------------------------------------------------
create table if not exists public.status_page_tokens (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  token text not null unique,
  label text not null default 'Status page',
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists status_page_tokens_household_id_idx
  on public.status_page_tokens (household_id);

alter table public.status_page_tokens enable row level security;

drop policy if exists status_page_tokens_member_select on public.status_page_tokens;
create policy status_page_tokens_member_select on public.status_page_tokens
  for select to authenticated
  using (public.is_household_member(household_id));

-- Ingest request stats (abuse / health) --------------------------------------------------------
create table if not exists public.ingest_stats (
  device_id uuid not null references public.devices (id) on delete cascade,
  day date not null,
  success_count integer not null default 0,
  error_count integer not null default 0,
  primary key (device_id, day)
);

alter table public.ingest_stats enable row level security;

drop policy if exists ingest_stats_member_select on public.ingest_stats;
create policy ingest_stats_member_select on public.ingest_stats
  for select to authenticated
  using (
    exists (
      select 1 from public.devices d
      where d.id = device_id and public.is_household_member(d.household_id)
    )
  );

-- Alert escalation + templates -----------------------------------------------------------------
alter table public.alert_settings
  add column if not exists escalation_enabled boolean not null default false;

alter table public.alert_settings
  add column if not exists escalation_minutes integer not null default 30;

alter table public.alert_settings
  add column if not exists alert_templates jsonb not null default '{}'::jsonb;

alter table public.alert_settings
  add column if not exists last_escalation_at timestamptz;

-- Battery history for trend alerts (stored on device meta.battery_history jsonb array)
-- No schema change — uses devices.meta

-- Telegram bot command webhook secret (optional per user)
alter table public.alert_settings
  add column if not exists telegram_command_secret text;
