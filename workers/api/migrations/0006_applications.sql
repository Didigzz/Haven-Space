CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  boarder_id INTEGER NOT NULL,
  landlord_id INTEGER NOT NULL,
  room_id INTEGER NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  confirmed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY (boarder_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_applications_boarder_active
  ON applications(boarder_id, deleted_at, created_at);

CREATE INDEX IF NOT EXISTS idx_applications_landlord_active
  ON applications(landlord_id, deleted_at, created_at);

CREATE INDEX IF NOT EXISTS idx_applications_room
  ON applications(room_id);
