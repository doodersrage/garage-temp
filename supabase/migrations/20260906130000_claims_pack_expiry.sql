-- Claims pack expiry + revoke -------------------------------------------------------------

alter table public.claims_pack_exports
  add column if not exists expires_at timestamptz,
  add column if not exists revoked_at timestamptz;

-- Default new packs to 90 days from creation (backfill existing rows too).
update public.claims_pack_exports
set expires_at = created_at + interval '90 days'
where expires_at is null;

alter table public.claims_pack_exports
  alter column expires_at set default (now() + interval '90 days');

create index if not exists claims_pack_exports_expires_at_idx
  on public.claims_pack_exports (expires_at);
