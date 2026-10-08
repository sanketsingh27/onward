-- Application database (APP_DB)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT,
  name TEXT
);

CREATE TABLE IF NOT EXISTS openings (
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
  description_plain TEXT,
  fit INTEGER,
  reason TEXT
);

CREATE TABLE IF NOT EXISTS state (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  opening_id TEXT,
  status TEXT,
  updated_at TEXT,
  UNIQUE(user_id, opening_id)
);
