-- Follow-up to 20260831140000 / 20260831150000.
-- Those revoked EXECUTE from anon/authenticated on admin and plan-sync
-- SECURITY DEFINER functions, but Postgres also grants EXECUTE to PUBLIC on
-- new functions. PUBLIC is not a role you inherit; it means every role,
-- including anon. Revoking only anon/authenticated therefore leaves the
-- PostgREST RPC path open, which is why the Dashboard linter still reports
-- lint 0028/0029 (anon/authenticated can execute SECURITY DEFINER functions).
--
-- Triggers (ensure_user_household, handle_new_user_group_membership) run as
-- the function owner and do not need client EXECUTE. RLS helpers
-- (is_admin_user, is_household_member) must stay executable by authenticated
-- so policies that call them keep working; they must not be callable by anon.

revoke all on function public.count_managed_users(uuid) from public, anon, authenticated;
revoke all on function public.list_managed_users(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.set_user_admin_membership(uuid, uuid, boolean) from public, anon, authenticated;

revoke all on function public.sync_plan_group_membership(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.sync_member_group_membership(uuid, boolean) from public, anon, authenticated;
revoke all on function public.get_user_household_id(uuid) from public, anon, authenticated;

revoke all on function public.ensure_user_household() from public, anon, authenticated;
revoke all on function public.handle_new_user_group_membership() from public, anon, authenticated;

revoke all on function public.is_admin_user(uuid) from public, anon;
revoke all on function public.is_household_member(uuid) from public, anon;

grant execute on function public.count_managed_users(uuid) to service_role;
grant execute on function public.list_managed_users(uuid, integer, integer) to service_role;
grant execute on function public.set_user_admin_membership(uuid, uuid, boolean) to service_role;
grant execute on function public.sync_plan_group_membership(uuid, text, boolean) to service_role;
grant execute on function public.sync_member_group_membership(uuid, boolean) to service_role;
grant execute on function public.get_user_household_id(uuid) to service_role;

grant execute on function public.is_admin_user(uuid) to authenticated, service_role;
grant execute on function public.is_household_member(uuid) to authenticated, service_role;
