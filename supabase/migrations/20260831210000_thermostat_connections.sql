-- Per-household Nest/Ecobee thermostat connections (Pro entitlement) -----------------------

create table if not exists public.household_thermostat_connections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  provider text not null check (provider in ('nest', 'ecobee')),
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  external_device_id text,
  connected_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, provider)
);

create index if not exists household_thermostat_connections_household_id_idx
  on public.household_thermostat_connections (household_id);

alter table public.household_thermostat_connections enable row level security;

-- Members can see that a connection exists (used to render the dashboard card);
-- writes go through service role in API handlers, same as api_keys.
drop policy if exists household_thermostat_connections_member_select
  on public.household_thermostat_connections;
create policy household_thermostat_connections_member_select
  on public.household_thermostat_connections
  for select to authenticated
  using (public.is_household_member(household_id));
