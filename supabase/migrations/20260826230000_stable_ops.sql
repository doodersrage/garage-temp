-- Server error log for production debugging (service role writes, admin reads)

create table if not exists public.server_errors (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  method text not null default 'GET',
  message text not null,
  stack text,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists server_errors_created_idx
  on public.server_errors (created_at desc);

alter table public.server_errors enable row level security;

-- Inserts via service role only; no authenticated insert policy

drop policy if exists server_errors_admin_select on public.server_errors;
create policy server_errors_admin_select on public.server_errors
  for select to authenticated
  using (public.is_admin_user(auth.uid()));
