create table if not exists user_temp_feeds (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  feed_id text not null,
  name text not null,
  url text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  unique (user_id, feed_id)
);

create table if not exists user_temp_probes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  probe_id text not null,
  feed_id text not null,
  probe_key text not null,
  label text not null,
  visible boolean not null default true,
  sort_order integer not null default 0,
  unique (user_id, probe_id)
);

create index if not exists user_temp_feeds_user_id_sort_idx
  on user_temp_feeds (user_id, sort_order);

create index if not exists user_temp_probes_user_id_sort_idx
  on user_temp_probes (user_id, sort_order);
