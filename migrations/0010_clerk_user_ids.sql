-- Clerk subjects are opaque strings. Preserve existing local data while moving
-- the remaining ownership columns away from SQLite integer affinities.
CREATE TABLE users_replacement (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT
);

INSERT INTO users_replacement (id, email, name)
SELECT CAST(id AS TEXT), email, name FROM users;

DROP TABLE users;
ALTER TABLE users_replacement RENAME TO users;

CREATE TABLE state_replacement (
  id INTEGER PRIMARY KEY,
  user_id TEXT,
  opening_id TEXT,
  status TEXT,
  updated_at TEXT,
  UNIQUE(user_id, opening_id)
);

INSERT INTO state_replacement (id, user_id, opening_id, status, updated_at)
SELECT id, CAST(user_id AS TEXT), opening_id, status, updated_at FROM state;

DROP TABLE state;
ALTER TABLE state_replacement RENAME TO state;
