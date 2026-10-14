import { Hono } from 'hono'
import { getOrCreateResumeEmbedding } from '../embed/embed'
import { hardFilter, type Profile } from '../filter/filter'
import { fromRow, type OpeningRow } from '../ingest/normalize'
import type { ApiEnv } from '../api/types'
import { queryVector } from '../vector/vector'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100
// D1 allows 100 bound parameters; reserve one slot for the authenticated owner.
const OPENINGS_PER_QUERY = 99

export const openingsRoutes = new Hono<ApiEnv>()

// Return available recommendations from this Profile's top vector recall without persisting Fit.
openingsRoutes.get('/openings', async (c) => {
  const requestedLimit = c.req.query('limit')
  const limit = requestedLimit === undefined ? DEFAULT_LIMIT : Number(requestedLimit)
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return c.json({ error: `limit must be an integer from 1 to ${MAX_LIMIT}` }, 400)
  }

  const userId = c.get('userId')
  const profileRow = await c.env.APP_DB.prepare('SELECT resume, filters FROM profile WHERE user_id = ?')
    .bind(userId)
    .first<{ resume: string; filters: string }>()
  if (!profileRow) return c.json({ error: 'no profile for authenticated user' }, 404)

  const resumeVector = await getOrCreateResumeEmbedding(c.env, userId, profileRow.resume)
  const matches = await queryVector(c.env, resumeVector, MAX_LIMIT)
  if (matches.length === 0) return c.json([])

  const ids = matches.map((match) => match.id)
  const results: OpeningRow[] = []
  for (let start = 0; start < ids.length; start += OPENINGS_PER_QUERY) {
    const batchIds = ids.length > OPENINGS_PER_QUERY ? ids.slice(start, start + OPENINGS_PER_QUERY) : ids
    const placeholders = batchIds.map(() => '?').join(',')
    const { results: rows } = await c.env.APP_DB.prepare(
      `SELECT o.id, o.board, o.company, o.title, o.location, o.secondary_locations, o.remote,
         o.currency, o.salary_min, o.salary_max, o.equity_min, o.equity_max, o.bonus,
         o.employment_type, o.published_at, o.apply_url, o.description_plain
       FROM openings o
       WHERE o.id IN (${placeholders})
         AND NOT EXISTS (
           SELECT 1 FROM state s
           WHERE s.user_id = ? AND s.opening_id = o.id AND s.status IN ('applied', 'dismissed')
         )`,
    ).bind(...batchIds, userId).all<OpeningRow>()
    results.push(...rows)
  }

  const survivors = new Map(
    hardFilter(results.map((row) => fromRow(row)), JSON.parse(profileRow.filters) as Profile)
      .survivors
      .map((opening) => [opening.id, opening]),
  )
  return c.json(matches.flatMap((match) => {
    const opening = survivors.get(match.id)
    return opening ? [{ ...opening, fit: Math.round(match.score * 100) }] : []
  }).slice(0, limit))
})

// Return this user's applied and dismissed Openings, newest state first.
openingsRoutes.get('/openings/history', async (c) => {
  const requestedLimit = c.req.query('limit')
  const limit = requestedLimit === undefined ? DEFAULT_LIMIT : Number(requestedLimit)
  const cursorValue = c.req.query('cursor')
  const cursor = cursorValue === undefined ? Number.MAX_SAFE_INTEGER : Number(cursorValue)
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return c.json({ error: `limit must be an integer from 1 to ${MAX_LIMIT}` }, 400)
  }
  if (!Number.isSafeInteger(cursor) || cursor < 1) {
    return c.json({ error: 'cursor must be a positive integer' }, 400)
  }

  const { results } = await c.env.APP_DB.prepare(
    `SELECT o.id, o.board, o.company, o.title, o.location, o.secondary_locations, o.remote,
       o.currency, o.salary_min, o.salary_max, o.equity_min, o.equity_max, o.bonus,
       o.employment_type, o.published_at, o.apply_url, o.description_plain,
       s.id AS state_id, s.status AS state
     FROM state s
     JOIN openings o ON o.id = s.opening_id
     WHERE s.user_id = ? AND s.status IN ('applied', 'dismissed') AND s.id < ?
     ORDER BY s.id DESC
     LIMIT ?`,
  ).bind(c.get('userId'), cursor, limit + 1).all<OpeningRow & { state_id: number; state: 'applied' | 'dismissed' }>()
  const page = results.slice(0, limit)
  return c.json({
    data: page.map((row) => ({ ...fromRow(row), state: row.state })),
    nextCursor: results.length > limit ? String(page[page.length - 1].state_id) : null,
  })
})

// List tracked Boards and their feed metadata.
openingsRoutes.get('/boards', async (c) => {
  const { results } = await c.env.BOARD_DB.prepare(
    'SELECT slug, company_name, feed_url, ats, last_fetched_at FROM boards ORDER BY slug',
  ).all()
  return c.json(results)
})
