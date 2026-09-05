-- Claim pucks: RP2040-Zero presence keys bound to a household bay (devices.space).

create table if not exists public.pucks (
  device_id text primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  secret_hex text not null,
  bay_id text,
  space_name text,
  mood_override text,
  mood_override_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pucks_device_id_hex check (device_id ~ '^[0-9a-f]{32}$'),
  constraint pucks_secret_hex check (secret_hex ~ '^[0-9a-f]{64}$'),
  constraint pucks_bay_id_format check (
    bay_id is null or bay_id ~ '^[A-Za-z0-9_.:-]{1,32}$'
  ),
  constraint pucks_mood_override_check check (
    mood_override is null
    or mood_override in ('cozy', 'drafty', 'shiver', 'panic', 'offline', 'hero')
  )
);

create index if not exists pucks_household_id_idx on public.pucks (household_id);
create unique index if not exists pucks_household_bay_unique
  on public.pucks (household_id, bay_id)
  where bay_id is not null;

create table if not exists public.puck_claim_pending (
  device_id text primary key references public.pucks (device_id) on delete cascade,
  bay_id text not null,
  nonce_hex text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint puck_claim_pending_bay check (bay_id ~ '^[A-Za-z0-9_.:-]{1,32}$'),
  constraint puck_claim_pending_nonce check (nonce_hex ~ '^[0-9a-f]{16,128}$')
);

alter table public.pucks enable row level security;
alter table public.puck_claim_pending enable row level security;

-- Reads for household members (secrets excluded via API; RLS still blocks anon).
drop policy if exists pucks_member_select on public.pucks;
create policy pucks_member_select on public.pucks
  for select to authenticated
  using (public.is_household_member(household_id));

-- Writes go through service-role API handlers only.
