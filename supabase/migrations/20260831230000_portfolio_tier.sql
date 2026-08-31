-- Portfolio tier: a new plan_tier ('portfolio') sitting above 'pro' for
-- landlords/property managers running many properties. Entitlement-wise it's a
-- strict superset of pro (see src/lib/entitlements.ts) -- the group membership
-- model below reflects that: a portfolio subscriber is granted the portfolio,
-- pro, AND member groups, mirroring how 'pro' already also grants 'member'.

insert into public.groups (name)
select 'portfolio'
where not exists (select 1 from public.groups where name = 'portfolio');

-- Replace sync_plan_group_membership (same signature as the original in
-- 20250825000000_devices_households_alerts.sql) to add the portfolio branch.
-- CREATE OR REPLACE on an unchanged signature keeps the existing object OID,
-- which keeps the service-role-only grant applied by
-- 20260831150000_lock_down_plan_sync_rpcs.sql intact -- no new grant
-- statements needed here.
create or replace function public.sync_plan_group_membership(
  target_user_id uuid,
  plan_tier text,
  is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  member_group_id uuid;
  pro_group_id uuid;
  portfolio_group_id uuid;
begin
  select id into member_group_id from public.groups where name = 'member' limit 1;
  select id into pro_group_id from public.groups where name = 'pro' limit 1;
  select id into portfolio_group_id from public.groups where name = 'portfolio' limit 1;

  if member_group_id is null or pro_group_id is null or portfolio_group_id is null then
    raise exception 'member/pro/portfolio groups not found';
  end if;

  delete from public.group_members
  where user_id = target_user_id
    and group_id in (member_group_id, pro_group_id, portfolio_group_id);

  if is_active then
    if plan_tier = 'portfolio' then
      insert into public.group_members (user_id, group_id, role)
      values (target_user_id, portfolio_group_id, 'member');
      insert into public.group_members (user_id, group_id, role)
      values (target_user_id, pro_group_id, 'member');
      insert into public.group_members (user_id, group_id, role)
      values (target_user_id, member_group_id, 'member');
    elsif plan_tier = 'pro' then
      insert into public.group_members (user_id, group_id, role)
      values (target_user_id, pro_group_id, 'member');
      insert into public.group_members (user_id, group_id, role)
      values (target_user_id, member_group_id, 'member');
    else
      insert into public.group_members (user_id, group_id, role)
      values (target_user_id, member_group_id, 'member');
    end if;
  end if;
end;
$$;
