CREATE TABLE IF NOT EXISTS saved_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  boarder_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  room_id INTEGER,
  saved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY (boarder_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_listings_unique_boarder_property
  ON saved_listings(boarder_id, property_id);

CREATE INDEX IF NOT EXISTS idx_saved_listings_boarder_saved
  ON saved_listings(boarder_id, saved_at);

CREATE INDEX IF NOT EXISTS idx_saved_listings_property
  ON saved_listings(property_id);
