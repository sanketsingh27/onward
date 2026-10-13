-- Clerk subjects are opaque strings, not SQLite row IDs.
-- Rebuild on every local bootstrap so the migration remains idempotent.
CREATE TABLE IF NOT EXISTS profile_replacement (
  user_id TEXT PRIMARY KEY,
  resume TEXT NOT NULL,
  filters TEXT NOT NULL
);

INSERT OR REPLACE INTO profile_replacement (user_id, resume, filters)
SELECT CAST(user_id AS TEXT), resume, filters FROM profile;

DROP TABLE IF EXISTS profile;
ALTER TABLE profile_replacement RENAME TO profile;
