-- Indoor reference sensor (any plan) + thermostat history snapshots (Pro OAuth) -----------

alter table public.households
  add column if not exists indoor_reference_sensor_id uuid
    references public.device_sensors (id) on delete set null;

comment on column public.households.indoor_reference_sensor_id is
  'Optional temperature sensor used as the household indoor reference when no thermostat OAuth is connected.';

create table if not exists public.thermostat_snapshots (
  id bigserial primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  provider text not null check (provider in ('nest', 'ecobee')),
  recorded_at timestamptz not null default now(),
  ambient_temp_f double precision,
  heat_setpoint_f double precision,
  cool_setpoint_f double precision,
  hvac_mode text,
  external_device_id text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists thermostat_snapshots_household_recorded_idx
  on public.thermostat_snapshots (household_id, recorded_at desc);

alter table public.thermostat_snapshots enable row level security;

drop policy if exists thermostat_snapshots_member_select on public.thermostat_snapshots;
create policy thermostat_snapshots_member_select
  on public.thermostat_snapshots
  for select to authenticated
  using (public.is_household_member(household_id));
