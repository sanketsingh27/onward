DROP TABLE IF EXISTS user_opening_fits;
DROP TABLE IF EXISTS vectors;
DROP TABLE IF EXISTS scans;
DROP TABLE IF EXISTS openings_new;

CREATE TABLE openings_new (
  id TEXT PRIMARY KEY,
  board TEXT,
  company TEXT,
  title TEXT,
  location TEXT,
  secondary_locations TEXT,
  remote TEXT,
  currency TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  equity_min REAL,
  equity_max REAL,
  bonus INTEGER,
  employment_type TEXT,
  published_at TEXT,
  apply_url TEXT,
  description_plain TEXT
);

INSERT INTO openings_new (
  id, board, company, title, location, secondary_locations, remote, currency,
  salary_min, salary_max, equity_min, equity_max, bonus, employment_type,
  published_at, apply_url, description_plain
)
SELECT
  id, board, company, title, location, secondary_locations, remote, currency,
  salary_min, salary_max, equity_min, equity_max, bonus, employment_type,
  published_at, apply_url, description_plain
FROM openings;

DROP TABLE openings;
ALTER TABLE openings_new RENAME TO openings;

CREATE TABLE IF NOT EXISTS opening_embeddings (
  opening_id TEXT PRIMARY KEY,
  description_hash TEXT NOT NULL
);
