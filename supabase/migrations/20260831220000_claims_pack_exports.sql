-- Durable, tokenized claims-pack exports (Pro) --------------------------------------------

create table if not exists public.claims_pack_exports (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  token text not null unique,
  range_from timestamptz not null,
  range_to timestamptz not null,
  content_hash text not null,
  pack_data jsonb not null,
  generated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists claims_pack_exports_household_id_idx
  on public.claims_pack_exports (household_id);

alter table public.claims_pack_exports enable row level security;

-- Members can see their own household's export history; writes go through
-- service role in API handlers, same as api_keys and status_page_tokens.
drop policy if exists claims_pack_exports_member_select on public.claims_pack_exports;
create policy claims_pack_exports_member_select on public.claims_pack_exports
  for select to authenticated
  using (public.is_household_member(household_id));
