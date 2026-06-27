insert into public.groups (name)
select 'user'
where not exists (
  select 1 from public.groups where name = 'user'
);

create or replace function public.handle_new_user_group_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_group_id uuid;
begin
  select id
  into user_group_id
  from public.groups
  where name = 'user'
  limit 1;

  if user_group_id is null then
    raise exception 'Default user group not found';
  end if;

  insert into public.group_members (user_id, group_id, role)
  select new.id, user_group_id, 'member'
  where not exists (
    select 1
    from public.group_members
    where user_id = new.id
      and group_id = user_group_id
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_add_to_user_group on auth.users;

create trigger on_auth_user_created_add_to_user_group
  after insert on auth.users
  for each row
  execute function public.handle_new_user_group_membership();

insert into public.group_members (user_id, group_id, role)
select u.id, g.id, 'member'
from auth.users u
cross join public.groups g
where g.name = 'user'
  and not exists (
    select 1
    from public.group_members gm
    where gm.user_id = u.id
      and gm.group_id = g.id
  );
