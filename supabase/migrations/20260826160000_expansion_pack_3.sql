-- Expansion pack 3: snooze/vacation, viewer role, inbound webhooks, freeze-map coords, monthly reports

-- alert_settings: snooze, vacation, device health thresholds, monthly report ----------------
alter table public.alert_settings
  add column if not exists snooze_until timestamptz;

alter table public.alert_settings
  add column if not exists vacation_until timestamptz;

alter table public.alert_settings
  add column if not exists battery_alerts_enabled boolean not null default false;

alter table public.alert_settings
  add column if not exists battery_threshold_pct integer not null default 20;

alter table public.alert_settings
  add column if not exists rssi_alerts_enabled boolean not null default false;

alter table public.alert_settings
  add column if not exists rssi_threshold integer not null default -80;

alter table public.alert_settings
  add column if not exists monthly_report_enabled boolean not null default false;

alter table public.alert_settings
  add column if not exists last_battery_alert_at timestamptz;

alter table public.alert_settings
  add column if not exists last_rssi_alert_at timestamptz;

alter table public.alert_settings
  add column if not exists last_monthly_report_at timestamptz;

-- household_members: viewer role -------------------------------------------------------------
alter table public.household_members
  drop constraint if exists household_members_role_check;

alter table public.household_members
  add constraint household_members_role_check
  check (role in ('owner', 'member', 'viewer'));

-- freeze_map_snapshots: geographic map pins --------------------------------------------------
alter table public.freeze_map_snapshots
  add column if not exists lat double precision;

alter table public.freeze_map_snapshots
  add column if not exists lon double precision;

-- Pro inbound webhooks (HA / automation → Garage Temp) ---------------------------------------
create table if not exists public.inbound_webhooks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null default 'Inbound webhook',
  token_prefix text not null,
  token_hash text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists inbound_webhooks_household_id_idx
  on public.inbound_webhooks (household_id);

alter table public.inbound_webhooks enable row level security;

drop policy if exists inbound_webhooks_member_select on public.inbound_webhooks;
create policy inbound_webhooks_member_select on public.inbound_webhooks
  for select to authenticated
  using (public.is_household_member(household_id));

-- One-click alert snooze tokens (Telegram/Slack/email links) ---------------------------------
create table if not exists public.alert_snooze_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  hours integer not null default 24,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists alert_snooze_tokens_user_id_idx
  on public.alert_snooze_tokens (user_id);

alter table public.alert_snooze_tokens enable row level security;

-- household_invites: optional viewer role -----------------------------------------------------
alter table public.household_invites
  add column if not exists role text not null default 'member';

alter table public.household_invites
  drop constraint if exists household_invites_role_check;

alter table public.household_invites
  add constraint household_invites_role_check
  check (role in ('member', 'viewer'));
