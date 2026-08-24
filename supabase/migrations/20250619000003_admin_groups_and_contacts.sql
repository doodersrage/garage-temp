-- Groups and membership (uuid schema — matches later migrations and generated types)
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Remote databases may predate the inline unique on name; ensure lookups stay stable.
create unique index if not exists groups_name_key on public.groups (name);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  role text not null default 'member',
  unique (group_id, user_id)
);

create index if not exists group_members_user_id_idx on public.group_members (user_id);

alter table public.group_members
  add column if not exists role text not null default 'member';

insert into public.groups (name)
select 'admin'
where not exists (
  select 1 from public.groups where name = 'admin'
);

create table if not exists public.contacts (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists contacts_created_at_idx on public.contacts (created_at desc);
