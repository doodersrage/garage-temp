-- Household invites, job runs, reading rollups / retention helpers

create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  email text not null,
  token text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists household_invites_household_id_idx
  on public.household_invites (household_id);

create index if not exists household_invites_email_idx
  on public.household_invites (lower(email));

create table if not exists public.job_runs (
  id bigserial primary key,
  job_name text not null,
  status text not null check (status in ('running', 'success', 'error')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  detail jsonb not null default '{}'::jsonb
);

create index if not exists job_runs_job_started_idx
  on public.job_runs (job_name, started_at desc);

create table if not exists public.sensor_reading_rollups (
  sensor_id uuid not null references public.device_sensors (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  bucket_start timestamptz not null,
  avg_num double precision,
  min_num double precision,
  max_num double precision,
  sample_count integer not null default 0,
  primary key (sensor_id, bucket_start)
);

create index if not exists sensor_reading_rollups_household_bucket_idx
  on public.sensor_reading_rollups (household_id, bucket_start desc);

alter table public.household_invites enable row level security;
alter table public.job_runs enable row level security;
alter table public.sensor_reading_rollups enable row level security;

drop policy if exists household_invites_member_select on public.household_invites;
create policy household_invites_member_select on public.household_invites
  for select to authenticated
  using (public.is_household_member(household_id));

drop policy if exists sensor_reading_rollups_member_select on public.sensor_reading_rollups;
create policy sensor_reading_rollups_member_select on public.sensor_reading_rollups
  for select to authenticated
  using (public.is_household_member(household_id));

-- job_runs: service role only (no authenticated policies)
