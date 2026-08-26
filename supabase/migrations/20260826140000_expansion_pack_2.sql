-- Expansion pack 2: freeze-map geo, api keys, device spaces, SMS critical quiet hours

-- households: geocode fields for custom freeze-map cities --------------------------------
alter table public.households
  add column if not exists freeze_map_lat double precision;

alter table public.households
  add column if not exists freeze_map_lon double precision;

alter table public.households
  add column if not exists freeze_map_label text;

-- devices: multi-space label -------------------------------------------------------------
alter table public.devices
  add column if not exists space text;

-- alert_settings: SMS during quiet hours for critical freeze/forecast --------------------
alter table public.alert_settings
  add column if not exists quiet_hours_sms_critical boolean not null default true;

-- Pro dashboard API keys -----------------------------------------------------------------
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null default 'Metrics key',
  key_prefix text not null,
  key_hash text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists api_keys_household_id_idx on public.api_keys (household_id);
create index if not exists api_keys_key_hash_idx on public.api_keys (key_hash)
  where revoked_at is null;

alter table public.api_keys enable row level security;

drop policy if exists api_keys_member_select on public.api_keys;
create policy api_keys_member_select on public.api_keys
  for select to authenticated
  using (public.is_household_member(household_id));

-- writes go through service role in API handlers
