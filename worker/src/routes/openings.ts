import { Hono } from 'hono'
import { fromRow, type OpeningWithFitRow } from '../ingest/normalize'
import { OPENINGS_FOR_USER, RANKED_OPENINGS_FOR_USER } from '../fit/fit'
import type { ApiEnv } from '../api/types'

export const openingsRoutes = new Hono<ApiEnv>()

// List this user's openings with a positive Fit, ordered highest first.
openingsRoutes.get('/openings', async (c) => {
  const { results } = await c.env.APP_DB.prepare(OPENINGS_FOR_USER)
    .bind(c.get('userId')).all<OpeningWithFitRow>()
  return c.json(results.map((row) => fromRow(row, row.fit)))
})

// List this user's ranked openings, excluding their applied or dismissed State.
openingsRoutes.get('/openings/ranked', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.APP_DB.prepare(RANKED_OPENINGS_FOR_USER)
    .bind(userId, userId).all<OpeningWithFitRow>()
  return c.json(results.map((row) => fromRow(row, row.fit)))
})

// List tracked job boards and their feed metadata.
openingsRoutes.get('/boards', async (c) => {
  const { results } = await c.env.BOARD_DB.prepare(
    'SELECT slug, company_name, feed_url, ats, last_fetched_at FROM boards ORDER BY slug',
  ).all()
  return c.json(results)
})
