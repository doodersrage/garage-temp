insert into public.groups (name)
select 'member'
where not exists (
  select 1 from public.groups where name = 'member'
);

create table if not exists public.stripe_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stripe_subscriptions_user_id_idx
  on public.stripe_subscriptions (user_id);

create index if not exists stripe_subscriptions_stripe_subscription_id_idx
  on public.stripe_subscriptions (stripe_subscription_id);

create or replace function public.sync_member_group_membership(
  target_user_id uuid,
  is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  member_group_id uuid;
begin
  select id
  into member_group_id
  from public.groups
  where name = 'member'
  limit 1;

  if member_group_id is null then
    raise exception 'Member group not found';
  end if;

  if is_active then
    insert into public.group_members (user_id, group_id, role)
    select target_user_id, member_group_id, 'member'
    where not exists (
      select 1
      from public.group_members
      where user_id = target_user_id
        and group_id = member_group_id
    );
  else
    delete from public.group_members
    where user_id = target_user_id
      and group_id = member_group_id;
  end if;
end;
$$;

grant execute on function public.sync_member_group_membership(uuid, boolean) to anon, authenticated;
