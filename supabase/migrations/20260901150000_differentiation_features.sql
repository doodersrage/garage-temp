-- Tenant relay + pre-season freeze drill tracking

ALTER TABLE households
  ADD COLUMN IF NOT EXISTS tenant_notify_email text,
  ADD COLUMN IF NOT EXISTS tenant_notify_name text;

ALTER TABLE alert_settings
  ADD COLUMN IF NOT EXISTS freeze_drill_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_freeze_drill_at timestamptz;

COMMENT ON COLUMN households.tenant_notify_email IS
  'Optional tenant/on-site contact for property managers to relay freeze alerts without dashboard access.';
COMMENT ON COLUMN alert_settings.last_freeze_drill_at IS
  'Last automated pre-season freeze drill email sent to this user.';
