import { verifyToken } from '@clerk/backend'
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

type AuthVariables = { userId: string }

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>()
app.use('*', cors())

app.use('*', async (c, next) => {
  if (c.req.path === '/health') return next()

  const authorization = c.req.header('Authorization')
  const match = authorization?.match(/^Bearer\s+(\S+)$/i)
  if (!match) return c.json({ error: 'unauthorized' }, 401)

  if (!c.env.CLERK_JWT_KEY || !c.env.CLERK_AUTHORIZED_PARTIES) {
    return c.json({ error: 'authentication is not configured' }, 503)
  }
  const parties = c.env.CLERK_AUTHORIZED_PARTIES.split(',').map((party) => party.trim()).filter(Boolean)
  if (parties.length === 0) return c.json({ error: 'authentication is not configured' }, 503)

  try {
    const token = await verifyToken(match[1], {
      jwtKey: c.env.CLERK_JWT_KEY,
      authorizedParties: parties,
    })
    if (!token.sub) return c.json({ error: 'unauthorized' }, 401)
    c.set('userId', token.sub)
  } catch {
    return c.json({ error: 'unauthorized' }, 401)
  }

  await next()
})

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
  const userId = c.get('userId')
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
  const body = await c.req.json<{ opening_id?: string; status?: string }>()
  if (!body.opening_id || !body.status || !isValidStatus(body.status)) {
    return c.json({ error: 'invalid state payload' }, 400)
  }
  await upsertState(c.env, c.get('userId'), body.opening_id, body.status)
  return c.json({ ok: true })
})

app.get('/state', async (c) => {
  return c.json(await listState(c.env, c.get('userId')))
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
  const jobId = crypto.randomUUID()
  const userId = c.get('userId')
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
  async queue(batch: MessageBatch<{ jobId: string; userId: string }>, env: Env) {
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
    await env.SCAN_QUEUE.send({ jobId: crypto.randomUUID(), userId: '1' })
  },
}
