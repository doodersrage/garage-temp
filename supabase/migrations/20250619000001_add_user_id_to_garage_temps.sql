alter table garage_temps
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

create index if not exists garage_temps_user_id_timestamp_idx
  on garage_temps (user_id, timestamp desc);
