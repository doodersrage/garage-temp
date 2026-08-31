-- SECURITY FIX: count_managed_users, list_managed_users, and
-- set_user_admin_membership decide "is the caller an admin?" by checking a
-- client-supplied caller_id parameter, not the caller's actual verified
-- identity. They were also granted EXECUTE to anon and authenticated, which
-- means Supabase's PostgREST RPC endpoint exposes them to ANY request that
-- carries just the public anon key -- no session, login, or admin status
-- required on the real caller's part. Anyone who supplied a genuine admin's
-- user id as caller_id (however they obtained it -- it doesn't have to be
-- their own) could call list_managed_users to read every user's email and
-- group membership, or call set_user_admin_membership to grant admin to any
-- account, including their own, directly against
-- https://<project>.supabase.co/rest/v1/rpc/set_user_admin_membership,
-- bypassing the app entirely.
--
-- The app itself only ever calls these three functions server-side, over the
-- service-role connection (src/lib/userManager.ts via createServerClient()),
-- after already verifying the session and admin status at the Astro layer.
-- So the fix is to make that the only path in: revoke anon/authenticated's
-- ability to call them via PostgREST at all, leaving just the service role,
-- which is a secret held only by the Cloudflare Worker backend and never
-- sent to a browser. This is a pure grant change -- no function body edited,
-- no risk to the app's own (already-correct) call path.
--
-- is_admin_user(uuid) is different: it's also used inside an RLS policy
-- (server_errors_admin_select, see 20260826230000_stable_ops.sql) evaluated
-- under the authenticated role for every signed-in user's own queries, and
-- that usage already calls it as is_admin_user(auth.uid()) -- the verified
-- session id, not a spoofable parameter, so it's not vulnerable. authenticated
-- keeps its grant so that policy keeps working; only anon is revoked, since
-- no legitimate anonymous request needs to ask "is this arbitrary id an
-- admin?" at all.

revoke execute on function public.is_admin_user(uuid) from anon;

revoke execute on function public.count_managed_users(uuid) from anon, authenticated;
revoke execute on function public.list_managed_users(uuid, integer, integer) from anon, authenticated;
revoke execute on function public.set_user_admin_membership(uuid, uuid, boolean) from anon, authenticated;

grant execute on function public.count_managed_users(uuid) to service_role;
grant execute on function public.list_managed_users(uuid, integer, integer) to service_role;
grant execute on function public.set_user_admin_membership(uuid, uuid, boolean) to service_role;
