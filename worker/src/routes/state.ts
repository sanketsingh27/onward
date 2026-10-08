import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { stateInputSchema } from '../api/schemas'
import type { ApiEnv } from '../api/types'
import { listState, upsertState } from '../state/state'

export const stateRoutes = new Hono<ApiEnv>()

// List this user's saved, applied, and dismissed opening states.
stateRoutes.get('/state', async (c) => c.json(await listState(c.env, c.get('userId'))))

// Set this user's state for an opening. Valid states: saved, applied, dismissed.
stateRoutes.put('/state', zValidator('json', stateInputSchema, (result, c) => {
  if (!result.success) return c.json({ error: 'invalid state payload' }, 400)
}), async (c) => {
  const { opening_id, status } = c.req.valid('json')
  await upsertState(c.env, c.get('userId'), opening_id, status)
  return c.json({ ok: true })
})
