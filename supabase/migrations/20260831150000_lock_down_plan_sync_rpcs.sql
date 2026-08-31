-- SECURITY FIX: sync_plan_group_membership and sync_member_group_membership
-- directly grant or revoke a user's "pro"/"member" plan-tier group
-- membership for any target_user_id, with no check on who is calling and
-- no relation to actual Stripe subscription state. Both were granted
-- EXECUTE to anon (sync_plan_group_membership) and anon + authenticated
-- (sync_member_group_membership), which means Supabase's PostgREST RPC
-- endpoint exposed them to any request carrying just the public anon key --
-- no login required for sync_plan_group_membership, and no more than an
-- ordinary account for either. Anyone could call, e.g.:
--
--   POST https://<project>.supabase.co/rest/v1/rpc/sync_plan_group_membership
--   { "target_user_id": "<any-uuid>", "plan_tier": "pro", "is_active": true }
--
-- and grant themselves (or anyone) the "pro" plan group -- which is what
-- gates pro features throughout the app -- for free, completely bypassing
-- Stripe billing. The same call with is_active: false could just as easily
-- strip a paying customer's access.
--
-- The app only ever calls these two functions server-side over the
-- service-role connection (src/lib/stripeSubscriptions.ts, via
-- createServerClient()), from Stripe webhook handling after Stripe itself
-- has already verified the subscription change. Revoke anon/authenticated
-- execute on both and grant only service_role -- no function body changes,
-- no risk to the app's existing call path (syncPlanGroupForUser calls
-- sync_plan_group_membership first, falling back to
-- sync_member_group_membership only if the former errors, e.g. before this
-- migration -- both remain callable by the service role either way).
--
-- Also tightening get_user_household_id(uuid): it takes a client-supplied
-- target_user_id with no check against the caller's own identity, and was
-- granted to `authenticated`, letting any signed-in user look up which
-- household any other user belongs to. Nothing in the app calls it via
-- PostgREST -- its only callers are one-time migration backfill blocks
-- (run as the migration owner, unaffected by this grant) -- so it doesn't
-- need to be reachable by ordinary users at all. service_role keeps it in
-- case a future server-side call needs it.

revoke execute on function public.sync_plan_group_membership(uuid, text, boolean) from anon, authenticated;
revoke execute on function public.sync_member_group_membership(uuid, boolean) from anon, authenticated;
revoke execute on function public.get_user_household_id(uuid) from authenticated;

grant execute on function public.sync_plan_group_membership(uuid, text, boolean) to service_role;
grant execute on function public.sync_member_group_membership(uuid, boolean) to service_role;
