-- Final expansion: referrals, battery trend alerts, door event log

alter table public.alert_settings
  add column if not exists battery_trend_alerts_enabled boolean not null default true;

alter table public.alert_settings
  add column if not exists last_battery_trend_alert_at timestamptz;

create table if not exists public.referral_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.referral_signups (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users (id) on delete cascade,
  referred_user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists referral_signups_referrer_idx
  on public.referral_signups (referrer_user_id, created_at desc);

alter table public.referral_codes enable row level security;
alter table public.referral_signups enable row level security;

drop policy if exists referral_codes_owner_select on public.referral_codes;
create policy referral_codes_owner_select on public.referral_codes
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists referral_signups_referrer_select on public.referral_signups;
create policy referral_signups_referrer_select on public.referral_signups
  for select to authenticated
  using (referrer_user_id = auth.uid());

create table if not exists public.door_open_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  sensor_id uuid references public.sensors (id) on delete set null,
  label text not null,
  opened_at timestamptz not null,
  closed_at timestamptz,
  duration_ms bigint,
  created_at timestamptz not null default now()
);

create index if not exists door_open_events_household_idx
  on public.door_open_events (household_id, opened_at desc);

alter table public.door_open_events enable row level security;

drop policy if exists door_open_events_member_select on public.door_open_events;
create policy door_open_events_member_select on public.door_open_events
  for select to authenticated
  using (public.is_household_member(household_id));
