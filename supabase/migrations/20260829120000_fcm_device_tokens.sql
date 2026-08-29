-- FCM device tokens for native Android (and future iOS) push alongside web push.
create table if not exists public.fcm_device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  platform text not null default 'android'
    check (platform in ('android', 'ios', 'web')),
  app_id text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists fcm_device_tokens_user_id_idx
  on public.fcm_device_tokens (user_id);

alter table public.fcm_device_tokens enable row level security;

drop policy if exists fcm_device_tokens_own on public.fcm_device_tokens;
create policy fcm_device_tokens_own on public.fcm_device_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
