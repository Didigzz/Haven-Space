ALTER TABLE applications ADD COLUMN leave_request_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE applications ADD COLUMN leave_request_date TEXT;
ALTER TABLE applications ADD COLUMN leave_request_reason TEXT;
ALTER TABLE applications ADD COLUMN intended_leave_date TEXT;

CREATE INDEX IF NOT EXISTS idx_applications_leave_request
  ON applications(leave_request_status, intended_leave_date);

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'direct',
  property_id INTEGER,
  created_by INTEGER NOT NULL,
  is_system_thread INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversations_property
  ON conversations(property_id, type);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_read_at TEXT,
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (conversation_id, user_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user
  ON conversation_participants(user_id, is_active);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  message_text TEXT NOT NULL DEFAULT '',
  has_attachment INTEGER NOT NULL DEFAULT 0,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  boarder_id INTEGER NOT NULL,
  landlord_id INTEGER NOT NULL,
  room_id INTEGER NOT NULL,
  property_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  late_fee REAL NOT NULL DEFAULT 0,
  due_date TEXT NOT NULL,
  paid_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  reminder_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (boarder_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payments_landlord_status
  ON payments(landlord_id, status);

CREATE INDEX IF NOT EXISTS idx_payments_boarder_status
  ON payments(boarder_id, status);

CREATE INDEX IF NOT EXISTS idx_payments_due_date
  ON payments(due_date);
