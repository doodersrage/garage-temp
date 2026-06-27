create or replace function public.is_admin_user(caller_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    inner join public.groups g on g.id = gm.group_id
    where gm.user_id = caller_id
      and g.name = 'admin'
  );
$$;

create or replace function public.count_managed_users(caller_id uuid)
returns bigint
language plpgsql
security definer
stable
set search_path = public, auth
as $$
begin
  if not public.is_admin_user(caller_id) then
    raise exception 'Forbidden';
  end if;

  return (select count(*) from auth.users);
end;
$$;

create or replace function public.list_managed_users(
  caller_id uuid,
  page_num integer default 1,
  page_size integer default 20
)
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  groups text[],
  is_admin boolean
)
language plpgsql
security definer
stable
set search_path = public, auth
as $$
declare
  safe_page integer;
  safe_page_size integer;
begin
  if not public.is_admin_user(caller_id) then
    raise exception 'Forbidden';
  end if;

  safe_page := greatest(coalesce(page_num, 1), 1);
  safe_page_size := greatest(coalesce(page_size, 20), 1);

  return query
  select
    u.id,
    u.email::text,
    u.created_at,
    coalesce(
      array_agg(distinct g.name order by g.name) filter (where g.name is not null),
      '{}'::text[]
    ),
    exists (
      select 1
      from public.group_members gm_admin
      inner join public.groups g_admin on g_admin.id = gm_admin.group_id
      where gm_admin.user_id = u.id
        and g_admin.name = 'admin'
    )
  from auth.users u
  left join public.group_members gm on gm.user_id = u.id
  left join public.groups g on g.id = gm.group_id
  group by u.id, u.email, u.created_at
  order by u.created_at desc
  offset (safe_page - 1) * safe_page_size
  limit safe_page_size;
end;
$$;

create or replace function public.set_user_admin_membership(
  caller_id uuid,
  target_user_id uuid,
  make_admin boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_group_id uuid;
begin
  if not public.is_admin_user(caller_id) then
    raise exception 'Forbidden';
  end if;

  if not make_admin and caller_id = target_user_id then
    raise exception 'Cannot remove your own admin access';
  end if;

  select id
  into admin_group_id
  from public.groups
  where name = 'admin'
  limit 1;

  if admin_group_id is null then
    raise exception 'Admin group not found';
  end if;

  if make_admin then
    insert into public.group_members (user_id, group_id, role)
    select target_user_id, admin_group_id, 'admin'
    where not exists (
      select 1
      from public.group_members
      where user_id = target_user_id
        and group_id = admin_group_id
    );
  else
    delete from public.group_members
    where user_id = target_user_id
      and group_id = admin_group_id;
  end if;
end;
$$;

grant execute on function public.is_admin_user(uuid) to anon, authenticated;
grant execute on function public.count_managed_users(uuid) to anon, authenticated;
grant execute on function public.list_managed_users(uuid, integer, integer) to anon, authenticated;
grant execute on function public.set_user_admin_membership(uuid, uuid, boolean) to anon, authenticated;
