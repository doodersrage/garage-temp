-- First-class garage/workshop sensor kinds beyond temp/humidity.
alter table public.device_sensors drop constraint if exists device_sensors_kind_check;

alter table public.device_sensors
  add constraint device_sensors_kind_check check (kind in (
    'temperature',
    'humidity',
    'co2',
    'pressure',
    'pm25',
    'voc',
    'level',
    'energy',
    'door',
    'power',
    'flood',
    'motion',
    'generic'
  ));
