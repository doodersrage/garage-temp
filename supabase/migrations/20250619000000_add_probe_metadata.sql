alter table garage_temps
  add column if not exists feed_name text,
  add column if not exists probe_label text,
  add column if not exists probe_key text;
