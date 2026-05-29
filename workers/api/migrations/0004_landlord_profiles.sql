CREATE TABLE IF NOT EXISTS landlord_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  boarding_house_name TEXT NOT NULL DEFAULT '',
  boarding_house_description TEXT NOT NULL DEFAULT '',
  property_type TEXT NOT NULL DEFAULT 'Single unit',
  total_rooms INTEGER NOT NULL DEFAULT 0,
  available_rooms INTEGER NOT NULL DEFAULT 0,
  welcome_message TEXT NOT NULL DEFAULT '',
  house_rules_file_url TEXT,
  house_rules_file_name TEXT,
  house_rules_file_size INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_landlord_profiles_user
  ON landlord_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_landlord_profiles_boarding_house_name
  ON landlord_profiles(boarding_house_name);
