CREATE TABLE IF NOT EXISTS user_opening_fits (
  user_id TEXT NOT NULL,
  opening_id TEXT NOT NULL,
  fit INTEGER NOT NULL,
  PRIMARY KEY (user_id, opening_id)
);
CREATE TABLE IF NOT EXISTS profile_new (
  user_id TEXT PRIMARY KEY,
  resume TEXT NOT NULL,
  filters TEXT NOT NULL
);

INSERT OR REPLACE INTO profile_new (user_id, resume, filters)
SELECT CAST(user_id AS TEXT), resume, filters FROM profile;

DROP TABLE profile;
ALTER TABLE profile_new RENAME TO profile;
