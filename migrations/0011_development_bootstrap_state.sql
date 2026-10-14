CREATE TABLE IF NOT EXISTS development_bootstrap_state (
  name TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  completed_at TEXT NOT NULL
);
