import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { embedInputSchema, reasonInputSchema } from '../api/schemas'
import type { ApiEnv } from '../api/types'
import { embedTexts } from '../embed/embed'
import { ingestBoards } from '../ingest/ingest'
import { generateReason } from '../rank/rank'

export const operationRoutes = new Hono<ApiEnv>()

// Fetch and normalize current postings from every registered board.
operationRoutes.post('/ingest', async (c) => c.json(await ingestBoards(c.env)))

// Embed one or more text values with Workers AI.
operationRoutes.post('/embed', zValidator('json', embedInputSchema, (result, c) => {
  if (!result.success) return c.json({ error: 'missing texts or invalid payload' }, 400)
}), async (c) => c.json({ data: await embedTexts(c.env.AI, c.req.valid('json').texts) }))


// Generate a brief fit explanation for one opening.
operationRoutes.post('/reason', zValidator('json', reasonInputSchema, (result, c) => {
  if (!result.success) return c.json({ error: 'missing resume or title' }, 400)
}), async (c) => {
  const body = c.req.valid('json')
  const reason = await generateReason(c.env.AI, body.resume, body.title, body.description ?? '')
  return c.json({ reason })
})
