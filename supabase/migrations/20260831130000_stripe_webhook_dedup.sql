-- Stripe delivers webhook events at-least-once; this table lets the webhook
-- handler recognize a duplicate delivery and skip re-running side effects
-- (subscription sync, referral reward grants) instead of assuming every
-- delivery is new.
create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

create index if not exists stripe_webhook_events_received_at_idx
  on public.stripe_webhook_events (received_at);

alter table public.stripe_webhook_events enable row level security;
-- No policies: only the Stripe webhook handler (service-role key, which
-- bypasses RLS) ever touches this table.
