-- Full product expansion: households, devices, sensors, readings, alerts, share, push, pro

insert into public.groups (name)
select 'pro'
where not exists (select 1 from public.groups where name = 'pro');

-- Households -----------------------------------------------------------------
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My household',
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create unique index if not exists household_members_one_owner_per_user_idx
  on public.household_members (user_id)
  where role = 'owner';

create index if not exists household_members_user_id_idx
  on public.household_members (user_id);

create index if not exists household_members_household_id_idx
  on public.household_members (household_id);

-- Devices & sensors ----------------------------------------------------------
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  source text not null check (source in ('pull_url', 'push')),
  pull_url text,
  ingest_key_hash text,
  ingest_key_prefix text,
  enabled boolean not null default true,
  last_seen_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists devices_household_id_idx on public.devices (household_id);
create index if not exists devices_ingest_key_hash_idx on public.devices (ingest_key_hash)
  where ingest_key_hash is not null;

create table if not exists public.device_sensors (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  key text not null,
  label text not null,
  kind text not null check (kind in (
    'temperature', 'humidity', 'co2', 'door', 'power', 'flood', 'generic'
  )),
  unit text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (device_id, key, kind)
);

create index if not exists device_sensors_device_id_idx on public.device_sensors (device_id);

create table if not exists public.sensor_readings (
  id bigserial primary key,
  sensor_id uuid not null references public.device_sensors (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  recorded_at timestamptz not null default now(),
  value_num double precision,
  value_bool boolean,
  value_text text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists sensor_readings_household_recorded_idx
  on public.sensor_readings (household_id, recorded_at desc);

create index if not exists sensor_readings_sensor_recorded_idx
  on public.sensor_readings (sensor_id, recorded_at desc);

-- Alert settings (per user) --------------------------------------------------
create table if not exists public.alert_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  digest_enabled boolean not null default false,
  freeze_threshold_f double precision not null default 34,
  humidity_threshold double precision not null default 75,
  rate_change_f double precision not null default 15,
  outage_hours double precision not null default 2,
  email text,
  channel_email boolean not null default true,
  channel_sms boolean not null default false,
  channel_discord boolean not null default false,
  channel_push boolean not null default false,
  channel_webhook boolean not null default false,
  discord_webhook_url text,
  sms_phone text,
  outbound_webhook_url text,
  outbound_webhook_secret text,
  last_alert_sent_at timestamptz,
  last_outage_alert_at timestamptz,
  last_rate_alert_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Push subscriptions ---------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

-- Share links ----------------------------------------------------------------
create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  household_id uuid not null references public.households (id) on delete cascade,
  scope text not null check (scope in ('live', 'history')),
  label text,
  expires_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists share_links_household_id_idx on public.share_links (household_id);
create index if not exists share_links_token_idx on public.share_links (token);

-- Stripe price tier tracking -------------------------------------------------
alter table public.stripe_subscriptions
  add column if not exists stripe_price_id text;

alter table public.stripe_subscriptions
  add column if not exists plan_tier text not null default 'member'
    check (plan_tier in ('member', 'pro'));

-- Helpers --------------------------------------------------------------------
create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.get_user_household_id(target_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id
  from public.household_members
  where user_id = target_user_id
  order by case when role = 'owner' then 0 else 1 end, created_at
  limit 1;
$$;

create or replace function public.ensure_user_household()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household_id uuid;
begin
  if exists (
    select 1 from public.household_members where user_id = new.id
  ) then
    return new;
  end if;

  insert into public.households (name)
  values (coalesce(split_part(new.email, '@', 1), 'My') || '''s household')
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_ensure_household on auth.users;
create trigger on_auth_user_created_ensure_household
  after insert on auth.users
  for each row
  execute function public.ensure_user_household();

-- Backfill households for existing users -------------------------------------
do $$
declare
  u record;
  hid uuid;
begin
  for u in select id, email from auth.users loop
    if not exists (
      select 1 from public.household_members where user_id = u.id
    ) then
      insert into public.households (name)
      values (coalesce(split_part(u.email, '@', 1), 'My') || '''s household')
      returning id into hid;

      insert into public.household_members (household_id, user_id, role)
      values (hid, u.id, 'owner');
    end if;
  end loop;
end;
$$;

-- Migrate feeds → devices ----------------------------------------------------
do $$
declare
  feed record;
  hid uuid;
  device_uuid uuid;
  probe record;
begin
  for feed in
    select * from public.user_temp_feeds order by user_id, sort_order
  loop
    hid := public.get_user_household_id(feed.user_id);
    if hid is null then
      continue;
    end if;

    -- skip if a pull device with same URL already exists for household
    if exists (
      select 1 from public.devices
      where household_id = hid
        and source = 'pull_url'
        and pull_url = feed.url
    ) then
      select id into device_uuid
      from public.devices
      where household_id = hid and source = 'pull_url' and pull_url = feed.url
      limit 1;
    else
      insert into public.devices (
        household_id, name, source, pull_url, enabled, sort_order
      )
      values (
        hid, feed.name, 'pull_url', feed.url, feed.enabled, feed.sort_order
      )
      returning id into device_uuid;
    end if;

    for probe in
      select * from public.user_temp_probes
      where user_id = feed.user_id and feed_id = feed.feed_id
      order by sort_order
    loop
      insert into public.device_sensors (
        device_id, key, label, kind, unit, visible, sort_order
      )
      values (
        device_uuid, probe.probe_key, probe.label, 'temperature', 'F',
        probe.visible, probe.sort_order
      )
      on conflict (device_id, key, kind) do nothing;

      insert into public.device_sensors (
        device_id, key, label, kind, unit, visible, sort_order
      )
      values (
        device_uuid, probe.probe_key, probe.label || ' humidity', 'humidity', '%',
        probe.visible, probe.sort_order
      )
      on conflict (device_id, key, kind) do nothing;
    end loop;
  end loop;
end;
$$;

-- Migrate garage_temps → sensor_readings (best-effort) -----------------------
do $$
declare
  reading record;
  hid uuid;
  temp_sensor uuid;
  hum_sensor uuid;
  device_uuid uuid;
begin
  for reading in
    select * from public.garage_temps
    where user_id is not null
    order by timestamp
    limit 50000
  loop
    hid := public.get_user_household_id(reading.user_id);
    if hid is null then
      continue;
    end if;

    select d.id into device_uuid
    from public.devices d
    where d.household_id = hid
      and d.source = 'pull_url'
      and (reading.feed_name is null or d.name = reading.feed_name)
    order by d.sort_order
    limit 1;

    if device_uuid is null then
      select d.id into device_uuid
      from public.devices d
      where d.household_id = hid
      order by d.sort_order
      limit 1;
    end if;

    if device_uuid is null then
      continue;
    end if;

    select id into temp_sensor
    from public.device_sensors
    where device_id = device_uuid
      and kind = 'temperature'
      and (reading.probe_key is null or key = reading.probe_key)
    order by sort_order
    limit 1;

    select id into hum_sensor
    from public.device_sensors
    where device_id = device_uuid
      and kind = 'humidity'
      and (reading.probe_key is null or key = reading.probe_key)
    order by sort_order
    limit 1;

    if temp_sensor is not null then
      insert into public.sensor_readings (
        sensor_id, household_id, recorded_at, value_num, meta
      )
      values (
        temp_sensor, hid, reading.timestamp, reading.tempf,
        jsonb_build_object('tempc', reading.tempc, 'tempf', reading.tempf, 'source', 'migrate')
      );
    end if;

    if hum_sensor is not null then
      insert into public.sensor_readings (
        sensor_id, household_id, recorded_at, value_num, meta
      )
      values (
        hum_sensor, hid, reading.timestamp, reading.humidity,
        jsonb_build_object('humidity', reading.humidity, 'source', 'migrate')
      );
    end if;
  end loop;
end;
$$;

-- Backfill alert_settings from empty defaults for all users ------------------
insert into public.alert_settings (user_id)
select u.id from auth.users u
where not exists (
  select 1 from public.alert_settings a where a.user_id = u.id
);

-- Sync pro/member group by plan_tier ----------------------------------------
create or replace function public.sync_plan_group_membership(
  target_user_id uuid,
  plan_tier text,
  is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  member_group_id uuid;
  pro_group_id uuid;
begin
  select id into member_group_id from public.groups where name = 'member' limit 1;
  select id into pro_group_id from public.groups where name = 'pro' limit 1;

  if member_group_id is null or pro_group_id is null then
    raise exception 'member/pro groups not found';
  end if;

  delete from public.group_members
  where user_id = target_user_id
    and group_id in (member_group_id, pro_group_id);

  if is_active then
    if plan_tier = 'pro' then
      insert into public.group_members (user_id, group_id, role)
      values (target_user_id, pro_group_id, 'member');
      insert into public.group_members (user_id, group_id, role)
      values (target_user_id, member_group_id, 'member');
    else
      insert into public.group_members (user_id, group_id, role)
      values (target_user_id, member_group_id, 'member');
    end if;
  end if;
end;
$$;

grant execute on function public.sync_plan_group_membership(uuid, text, boolean)
  to anon, authenticated, service_role;

grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.get_user_household_id(uuid) to authenticated, service_role;

-- Keep legacy sync_member_group_membership working --------------------------
create or replace function public.sync_member_group_membership(
  target_user_id uuid,
  is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_plan_group_membership(target_user_id, 'member', is_active);
end;
$$;

-- RLS ------------------------------------------------------------------------
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.devices enable row level security;
alter table public.device_sensors enable row level security;
alter table public.sensor_readings enable row level security;
alter table public.alert_settings enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.share_links enable row level security;
alter table public.stripe_subscriptions enable row level security;

drop policy if exists households_member_select on public.households;
create policy households_member_select on public.households
  for select to authenticated
  using (public.is_household_member(id));

drop policy if exists households_owner_update on public.households;
create policy households_owner_update on public.households
  for update to authenticated
  using (
    exists (
      select 1 from public.household_members
      where household_id = id and user_id = auth.uid() and role = 'owner'
    )
  );

drop policy if exists household_members_select on public.household_members;
create policy household_members_select on public.household_members
  for select to authenticated
  using (public.is_household_member(household_id));

drop policy if exists devices_member_all on public.devices;
create policy devices_member_all on public.devices
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

drop policy if exists device_sensors_member_all on public.device_sensors;
create policy device_sensors_member_all on public.device_sensors
  for all to authenticated
  using (
    exists (
      select 1 from public.devices d
      where d.id = device_id and public.is_household_member(d.household_id)
    )
  )
  with check (
    exists (
      select 1 from public.devices d
      where d.id = device_id and public.is_household_member(d.household_id)
    )
  );

drop policy if exists sensor_readings_member_select on public.sensor_readings;
create policy sensor_readings_member_select on public.sensor_readings
  for select to authenticated
  using (public.is_household_member(household_id));

drop policy if exists sensor_readings_member_insert on public.sensor_readings;
create policy sensor_readings_member_insert on public.sensor_readings
  for insert to authenticated
  with check (public.is_household_member(household_id));

drop policy if exists alert_settings_own on public.alert_settings;
create policy alert_settings_own on public.alert_settings
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists share_links_member_all on public.share_links;
create policy share_links_member_all on public.share_links
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

drop policy if exists stripe_subscriptions_own on public.stripe_subscriptions;
create policy stripe_subscriptions_own on public.stripe_subscriptions
  for select to authenticated
  using (user_id = auth.uid());
