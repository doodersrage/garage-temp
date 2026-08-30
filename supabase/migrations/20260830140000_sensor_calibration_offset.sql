-- Per-sensor calibration offset applied at read/display/alert time (raw readings stay unchanged).
alter table public.device_sensors
  add column if not exists offset_num double precision not null default 0;
