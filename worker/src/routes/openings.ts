import { Hono } from 'hono'
import { fromRow, type OpeningRow } from '../ingest/normalize'
import type { ApiEnv } from '../api/types'

export const openingsRoutes = new Hono<ApiEnv>()

// List openings with a positive fit score, ordered from highest to lowest.
openingsRoutes.get('/openings', async (c) => {
  const { results } = await c.env.APP_DB.prepare(
    'SELECT * FROM openings WHERE fit > 0 ORDER BY fit DESC',
  ).all<OpeningRow>()
  return c.json(results.map(fromRow))
})

// List ranked openings, excluding openings this user applied to or dismissed.
openingsRoutes.get('/openings/ranked', async (c) => {
  const { results } = await c.env.APP_DB.prepare(
    `SELECT o.* FROM openings o
     WHERE o.fit > 0
       AND o.id NOT IN (SELECT opening_id FROM state WHERE user_id = ? AND status IN ('applied','dismissed'))
     ORDER BY o.fit DESC`,
  ).bind(c.get('userId')).all<OpeningRow>()
  return c.json(results.map(fromRow))
})

// List tracked job boards and their feed metadata.
openingsRoutes.get('/boards', async (c) => {
  const { results } = await c.env.BOARD_DB.prepare(
    'SELECT slug, company_name, feed_url, ats, last_fetched_at FROM boards ORDER BY slug',
  ).all()
  return c.json(results)
})
