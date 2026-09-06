-- Admin user manager: search, group filter, and sort while keeping pagination
-- in the database. Drop the old 1-arg / 3-arg signatures so PostgREST is not
-- left with overloads. EXECUTE stays service_role only (same as 20260903170000).

drop function if exists public.count_managed_users(uuid);
drop function if exists public.list_managed_users(uuid, integer, integer);

create or replace function public.count_managed_users(
  caller_id uuid,
  search_text text default null,
  group_filter text default null
)
returns bigint
language plpgsql
security definer
stable
set search_path = public, auth
as $$
declare
  safe_search text;
  safe_group text;
begin
  if not public.is_admin_user(caller_id) then
    raise exception 'Forbidden';
  end if;

  safe_search := nullif(btrim(coalesce(search_text, '')), '');
  safe_group := nullif(btrim(coalesce(group_filter, '')), '');
  if safe_group is not null
     and safe_group not in ('admin', 'portfolio', 'pro', 'member', 'user') then
    safe_group := null;
  end if;

  return (
    select count(*)
    from auth.users u
    where (
      safe_search is null
      or u.email ilike '%' || replace(replace(replace(safe_search, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
      or u.id::text ilike '%' || replace(replace(replace(safe_search, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
    )
    and (
      safe_group is null
      or exists (
        select 1
        from public.group_members gm_f
        inner join public.groups g_f on g_f.id = gm_f.group_id
        where gm_f.user_id = u.id
          and g_f.name = safe_group
      )
    )
  );
end;
$$;

create or replace function public.list_managed_users(
  caller_id uuid,
  page_num integer default 1,
  page_size integer default 20,
  search_text text default null,
  group_filter text default null,
  sort_by text default 'created_at',
  sort_dir text default 'desc'
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
  safe_search text;
  safe_group text;
  safe_sort text;
  safe_dir text;
begin
  if not public.is_admin_user(caller_id) then
    raise exception 'Forbidden';
  end if;

  safe_page := greatest(coalesce(page_num, 1), 1);
  safe_page_size := least(greatest(coalesce(page_size, 20), 1), 100);

  safe_search := nullif(btrim(coalesce(search_text, '')), '');
  safe_group := nullif(btrim(coalesce(group_filter, '')), '');
  if safe_group is not null
     and safe_group not in ('admin', 'portfolio', 'pro', 'member', 'user') then
    safe_group := null;
  end if;

  safe_sort := case
    when lower(coalesce(sort_by, '')) = 'email' then 'email'
    else 'created_at'
  end;
  safe_dir := case
    when lower(coalesce(sort_dir, '')) = 'asc' then 'asc'
    else 'desc'
  end;

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
  where (
    safe_search is null
    or u.email ilike '%' || replace(replace(replace(safe_search, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
    or u.id::text ilike '%' || replace(replace(replace(safe_search, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
  )
  and (
    safe_group is null
    or exists (
      select 1
      from public.group_members gm_f
      inner join public.groups g_f on g_f.id = gm_f.group_id
      where gm_f.user_id = u.id
        and g_f.name = safe_group
    )
  )
  group by u.id, u.email, u.created_at
  order by
    case when safe_sort = 'email' and safe_dir = 'asc' then lower(u.email) end asc nulls last,
    case when safe_sort = 'email' and safe_dir = 'desc' then lower(u.email) end desc nulls last,
    case when safe_sort = 'created_at' and safe_dir = 'asc' then u.created_at end asc nulls last,
    case when safe_sort = 'created_at' and safe_dir = 'desc' then u.created_at end desc nulls last,
    u.created_at desc
  offset (safe_page - 1) * safe_page_size
  limit safe_page_size;
end;
$$;

revoke all on function public.count_managed_users(uuid, text, text) from public, anon, authenticated;
revoke all on function public.list_managed_users(uuid, integer, integer, text, text, text, text) from public, anon, authenticated;

grant execute on function public.count_managed_users(uuid, text, text) to service_role;
grant execute on function public.list_managed_users(uuid, integer, integer, text, text, text, text) to service_role;
