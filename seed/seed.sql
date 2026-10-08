-- Idempotent seed for the board registry. Run against BOARD_DB.
-- company_name is NULL because the source CSV leaves it empty for Ashby;
-- the display falls back to the slug (see PRD: normalizing names is out of scope).
INSERT OR IGNORE INTO boards (slug, company_name, feed_url, ats) VALUES
  ('openai',            NULL, 'https://api.ashbyhq.com/posting-api/job-board/openai',            'ashby'),
  ('airwallex',         NULL, 'https://api.ashbyhq.com/posting-api/job-board/airwallex',         'ashby'),
  ('airapps',           NULL, 'https://api.ashbyhq.com/posting-api/job-board/airapps',           'ashby'),
  ('lilt-production',   NULL, 'https://api.ashbyhq.com/posting-api/job-board/lilt-production',   'ashby'),
  ('alpacahealth',      NULL, 'https://api.ashbyhq.com/posting-api/job-board/alpacahealth',      'ashby'),
  ('neura-robotics-gmbh', NULL, 'https://api.ashbyhq.com/posting-api/job-board/neura-robotics-gmbh', 'ashby'),
  ('crusoe',            NULL, 'https://api.ashbyhq.com/posting-api/job-board/crusoe',            'ashby'),
  ('snowflake',         NULL, 'https://api.ashbyhq.com/posting-api/job-board/snowflake',         'ashby'),
  ('renuity',           NULL, 'https://api.ashbyhq.com/posting-api/job-board/renuity',           'ashby'),
  ('bjakcareer',        NULL, 'https://api.ashbyhq.com/posting-api/job-board/bjakcareer',        'ashby');
