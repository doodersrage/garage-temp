-- Allow stripe_subscriptions.plan_tier = 'portfolio'.
-- The original check from 20250825000000 only permitted member|pro; without this,
-- webhook upserts for Portfolio checkouts fail the constraint and never sync groups.

alter table public.stripe_subscriptions
  drop constraint if exists stripe_subscriptions_plan_tier_check;

alter table public.stripe_subscriptions
  add constraint stripe_subscriptions_plan_tier_check
  check (plan_tier in ('member', 'pro', 'portfolio'));
