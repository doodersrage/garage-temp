-- Finish the status-subscriptions feature: real double opt-in, a working
-- unsubscribe path, and state tracking for edge-triggered notifications.
--
-- The original /api/status/subscribe inserted a row with confirmed_at set
-- immediately -- no verification that the caller actually controls that
-- email address -- and nothing in the app ever read this table, so no
-- notification was ever sent to anyone. That's now fixed at the
-- application layer (email a confirm link, generate/rotate a token,
-- delete the row on unsubscribe), but existing rows were "confirmed"
-- without ever actually confirming anything. Reset them to unconfirmed
-- here rather than start emailing people who never opted in through the
-- real flow, now that emails will actually go out.
--
-- Also de-dupes by email (repeated old submissions could have created
-- multiple rows for the same address) and adds a uniqueness constraint so
-- the app can safely upsert-by-email going forward.

delete from public.status_subscriptions a
using public.status_subscriptions b
where a.email = b.email
  and a.created_at > b.created_at;

update public.status_subscriptions set confirmed_at = null;

alter table public.status_subscriptions
  add constraint status_subscriptions_email_key unique (email);

-- Singleton row tracking the last-known system health, so the scheduled
-- notifier can email subscribers only on a genuine up/down transition
-- instead of on every run.
create table if not exists public.status_notify_state (
  id integer primary key default 1,
  last_healthy boolean,
  updated_at timestamptz not null default now(),
  constraint status_notify_state_singleton check (id = 1)
);

alter table public.status_notify_state enable row level security;
-- No policies on either table: service role only, same as the comment on
-- the original status_subscriptions table already said.
