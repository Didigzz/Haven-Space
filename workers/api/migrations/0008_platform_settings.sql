CREATE TABLE IF NOT EXISTS platform_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO platform_settings (setting_key, setting_value)
VALUES
  ('maintenance_message', ''),
  ('terms_version', '1.0'),
  ('privacy_version', '1.0'),
  ('platform_fee_percent', '5.00'),
  ('notify_admin_new_landlord', '0')
ON CONFLICT(setting_key) DO NOTHING;
