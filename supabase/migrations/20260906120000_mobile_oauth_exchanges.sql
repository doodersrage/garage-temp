-- One-time mobile OAuth exchange tokens (jti consumed on verify).
-- Only the exchange handler (service-role key, which bypasses RLS) touches this table.
create table if not exists public.mobile_oauth_exchanges (
  jti text primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists mobile_oauth_exchanges_expires_at_idx
  on public.mobile_oauth_exchanges (expires_at);

alter table public.mobile_oauth_exchanges enable row level security;
-- No policies: service role only.
