create table if not exists groups (
  id bigint generated always as identity primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  id bigint generated always as identity primary key,
  group_id bigint not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index if not exists group_members_user_id_idx on group_members (user_id);

insert into groups (name) values ('admin') on conflict (name) do nothing;

create table if not exists contacts (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists contacts_created_at_idx on contacts (created_at desc);
