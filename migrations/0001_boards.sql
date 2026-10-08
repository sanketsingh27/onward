-- Board registry database (BOARD_DB)
CREATE TABLE IF NOT EXISTS boards (
  slug TEXT PRIMARY KEY,
  company_name TEXT,
  feed_url TEXT NOT NULL,
  ats TEXT NOT NULL,
  last_fetched_at TEXT
);
