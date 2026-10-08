import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './env'
import { ingestBoards } from './ingest/ingest'
import { fromRow, type OpeningRow } from './ingest/normalize'
import { isValidStatus, listState, upsertState } from './state/state'
import { embedTexts } from './embed/embed'
import { scoreSurvivors } from './vector/vector'
import { generateReason, rankOpenings } from './rank/rank'
import { markScan, runScan } from './scan/scan'

const app = new Hono<{ Bindings: Env }>()
app.use('*', cors())

app.get('/health', (c) => c.json({ ok: true }))

app.get('/boards', async (c) => {
  const { results } = await c.env.BOARD_DB.prepare(
    'SELECT slug, company_name, feed_url, ats, last_fetched_at FROM boards ORDER BY slug',
  ).all()
  return c.json(results)
})

app.get('/openings', async (c) => {
  const { results } = await c.env.APP_DB.prepare(
    'SELECT * FROM openings WHERE fit > 0 ORDER BY fit DESC',
  ).all<OpeningRow>()
  return c.json(results.map(fromRow))
})

app.get('/openings/ranked', async (c) => {
  const userId = Number(c.req.query('user') ?? 1)
  const { results } = await c.env.APP_DB.prepare(
    `SELECT o.* FROM openings o
     WHERE o.fit > 0
       AND o.id NOT IN (SELECT opening_id FROM state WHERE user_id = ? AND status IN ('applied','dismissed'))
     ORDER BY o.fit DESC`,
  ).bind(userId).all<OpeningRow>()
  return c.json(results.map(fromRow))
})

app.post('/ingest', async (c) => {
  const outcomes = await ingestBoards(c.env)
  return c.json(outcomes)
})

app.put('/state', async (c) => {
  const body = await c.req.json<{ user_id?: number; opening_id?: string; status?: string }>()
  if (typeof body.user_id !== 'number' || !body.opening_id || !body.status || !isValidStatus(body.status)) {
    return c.json({ error: 'invalid state payload' }, 400)
  }
  await upsertState(c.env, body.user_id, body.opening_id, body.status)
  return c.json({ ok: true })
})

app.get('/state', async (c) => {
  const userId = Number(c.req.query('user'))
  if (!Number.isInteger(userId)) return c.json({ error: 'missing user' }, 400)
  return c.json(await listState(c.env, userId))
})

app.post('/embed', async (c) => {
  const body = await c.req.json<{ texts?: string[] }>()
  if (!body.texts?.length) return c.json({ error: 'missing texts' }, 400)
  const data = await embedTexts(c.env.AI, body.texts)
  return c.json({ data })
})

app.post('/score', async (c) => {
  try {
    const n = await scoreSurvivors(c.env)
    return c.json({ scored: n })
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})

app.post('/reason', async (c) => {
  const body = await c.req.json<{ resume?: string; title?: string; description?: string }>()
  if (!body.resume || !body.title) return c.json({ error: 'missing resume or title' }, 400)
  try {
    const reason = await generateReason(c.env.AI, body.resume, body.title, body.description ?? '')
    return c.json({ reason })
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})

app.post('/rank', async (c) => {
  const body = await c.req.json<{ resume?: string; topN?: number }>()
  if (!body.resume) return c.json({ error: 'missing resume' }, 400)
  const n = await rankOpenings(c.env, body.resume, body.topN ?? 10)
  return c.json({ ranked: n })
})

app.post('/scan', async (c) => {
  const body = await c.req.json<{ userId?: number }>()
  const userId = body.userId ?? 1
  const jobId = crypto.randomUUID()
  await markScan(c.env, jobId, 'queued')
  await c.env.SCAN_QUEUE.send({ jobId, userId })
  return c.json({ jobId })
})

app.get('/scan/:id', async (c) => {
  const id = c.req.param('id')
  const row = await c.env.APP_DB.prepare('SELECT * FROM scans WHERE id = ?').bind(id).first()
  return c.json(row ?? { error: 'not found' })
})

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<{ jobId: string; userId: number }>, env: Env) {
    for (const msg of batch.messages) {
      const { jobId, userId } = msg.body
      await markScan(env, jobId, 'running')
      try {
        const report = await runScan(env, userId)
        await markScan(env, jobId, 'done', JSON.stringify(report))
      } catch (e) {
        await markScan(env, jobId, 'error', e instanceof Error ? e.message : String(e))
      }
    }
  },
  async scheduled(_controller: ScheduledController, env: Env) {
    await env.SCAN_QUEUE.send({ jobId: crypto.randomUUID(), userId: 1 })
  },
}
