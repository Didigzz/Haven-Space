CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address_line_1 TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  province TEXT NOT NULL DEFAULT '',
  latitude REAL,
  longitude REAL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  landlord_id INTEGER NOT NULL,
  address_id INTEGER,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  property_type TEXT NOT NULL DEFAULT 'boarding-house',
  price REAL NOT NULL DEFAULT 0,
  deposit REAL NOT NULL DEFAULT 0,
  advance TEXT NOT NULL DEFAULT 'None',
  min_stay TEXT NOT NULL DEFAULT '',
  house_rules TEXT,
  gender_preference TEXT NOT NULL DEFAULT 'any',
  property_rules TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'available',
  listing_moderation_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_properties_public_location
  ON properties(address_id, listing_moderation_status, deleted_at);

CREATE INDEX IF NOT EXISTS idx_addresses_city_province
  ON addresses(city, province);
