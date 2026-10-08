import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { embedInputSchema, rankInputSchema, reasonInputSchema } from '../api/schemas'
import type { ApiEnv } from '../api/types'
import { embedTexts } from '../embed/embed'
import { ingestBoards } from '../ingest/ingest'
import { generateReason, rankOpenings } from '../rank/rank'
import { scoreSurvivors } from '../vector/vector'

export const operationRoutes = new Hono<ApiEnv>()

// Fetch and normalize current postings from every registered board.
operationRoutes.post('/ingest', async (c) => c.json(await ingestBoards(c.env)))

// Embed one or more text values with Workers AI.
operationRoutes.post('/embed', zValidator('json', embedInputSchema, (result, c) => {
  if (!result.success) return c.json({ error: 'missing texts or invalid payload' }, 400)
}), async (c) => c.json({ data: await embedTexts(c.env.AI, c.req.valid('json').texts) }))

// Recompute fit scores for eligible openings.
operationRoutes.post('/score', async (c) => {
  const scored = await scoreSurvivors(c.env)
  return c.json({ scored })
})

// Generate a brief fit explanation for one opening.
operationRoutes.post('/reason', zValidator('json', reasonInputSchema, (result, c) => {
  if (!result.success) return c.json({ error: 'missing resume or title' }, 400)
}), async (c) => {
  const body = c.req.valid('json')
  const reason = await generateReason(c.env.AI, body.resume, body.title, body.description ?? '')
  return c.json({ reason })
})

// Rank openings against a resume, returning the number ranked.
operationRoutes.post('/rank', zValidator('json', rankInputSchema, (result, c) => {
  if (!result.success) return c.json({ error: 'missing resume or invalid topN' }, 400)
}), async (c) => {
  const { resume, topN } = c.req.valid('json')
  return c.json({ ranked: await rankOpenings(c.env, resume, topN ?? 10) })
})
