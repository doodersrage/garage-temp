-- Kitchen sink: alert acks, referrer rewards, reading webhooks, inbound signing, space routing

alter table public.alert_events
  add column if not exists acknowledged_at timestamptz;

create index if not exists alert_events_user_unacked_idx
  on public.alert_events (user_id, created_at desc)
  where acknowledged_at is null;

alter table public.referral_signups
  add column if not exists referrer_rewarded_at timestamptz;

alter table public.alert_settings
  add column if not exists reading_webhook_url text,
  add column if not exists reading_webhook_secret text,
  add column if not exists space_channel_routing jsonb not null default '{}'::jsonb;

alter table public.inbound_webhooks
  add column if not exists signing_secret text;
