-- Monetization ops: drip emails, trial reminders, webhook delivery log

alter table public.alert_settings
  add column if not exists drip_emails_enabled boolean not null default true,
  add column if not exists last_drip_email_at timestamptz,
  add column if not exists drip_email_stage integer not null default 0,
  add column if not exists last_trial_reminder_at timestamptz;

create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  webhook_type text not null,
  url_host text not null,
  status_code integer,
  success boolean not null default false,
  error_message text,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists webhook_deliveries_user_idx
  on public.webhook_deliveries (user_id, created_at desc);

alter table public.webhook_deliveries enable row level security;

drop policy if exists webhook_deliveries_owner_select on public.webhook_deliveries;
create policy webhook_deliveries_owner_select on public.webhook_deliveries
  for select to authenticated
  using (user_id = auth.uid());

alter table public.alert_settings
  add column if not exists quarterly_report_enabled boolean not null default false,
  add column if not exists last_quarterly_report_at timestamptz;
