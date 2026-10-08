import { Hono } from 'hono'
import type { ApiEnv } from '../api/types'
import { markScan } from '../scan/scan'

export const scanRoutes = new Hono<ApiEnv>()

// Queue a scan for the signed-in user and return its job ID.
scanRoutes.post('/scan', async (c) => {
  const jobId = crypto.randomUUID()
  const userId = c.get('userId')
  await markScan(c.env, jobId, 'queued')
  await c.env.SCAN_QUEUE.send({ jobId, userId })
  return c.json({ jobId })
})

// Read the status and result detail for a scan job.
scanRoutes.get('/scan/:id', async (c) => {
  const row = await c.env.APP_DB.prepare('SELECT * FROM scans WHERE id = ?').bind(c.req.param('id')).first()
  if (!row) return c.json({ error: 'not found' }, 404)
  return c.json(row)
})
