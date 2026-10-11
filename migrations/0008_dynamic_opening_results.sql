DROP TABLE IF EXISTS user_opening_fits;
DROP TABLE IF EXISTS vectors;
DROP TABLE IF EXISTS scans;

ALTER TABLE openings DROP COLUMN fit;
ALTER TABLE openings DROP COLUMN reason;

CREATE TABLE opening_embeddings (
  opening_id TEXT PRIMARY KEY,
  description_hash TEXT NOT NULL
);
