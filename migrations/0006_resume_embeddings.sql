CREATE TABLE IF NOT EXISTS resume_embeddings (
  user_id TEXT PRIMARY KEY,
  resume_hash TEXT NOT NULL,
  vector TEXT NOT NULL
);

DELETE FROM vectors WHERE key = 'resume';
