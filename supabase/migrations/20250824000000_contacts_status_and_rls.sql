alter table contacts
  add column if not exists status text not null default 'new';

alter table contacts
  add column if not exists admin_notes text;

create index if not exists contacts_status_idx on contacts (status);

alter table garage_temps enable row level security;
alter table user_temp_feeds enable row level security;
alter table user_temp_probes enable row level security;
alter table contacts enable row level security;
alter table group_members enable row level security;
alter table groups enable row level security;
