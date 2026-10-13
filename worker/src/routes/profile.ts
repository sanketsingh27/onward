import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { profileInputSchema, type ProfileInput } from '../api/schemas'
import type { ApiEnv } from '../api/types'

export const profileRoutes = new Hono<ApiEnv>()

type ProfileRow = {
  resume: string
  filters: string
}

profileRoutes.get('/profile', async (c) => {
  const profile = await c.env.APP_DB.prepare('SELECT resume, filters FROM profile WHERE user_id = ?')
    .bind(c.get('userId'))
    .first<ProfileRow>()
  if (!profile) return c.json({ error: 'no profile for authenticated user' }, 404)

  return c.json({ resume: profile.resume, filters: JSON.parse(profile.filters) as ProfileInput['filters'] })
})

profileRoutes.put('/profile', zValidator('json', profileInputSchema, (result, c) => {
  if (!result.success) return c.json({ error: 'invalid profile payload' }, 400)
}), async (c) => {
  const profile = c.req.valid('json')
  await c.env.APP_DB.prepare(`INSERT INTO profile (user_id, resume, filters) VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET resume = excluded.resume, filters = excluded.filters`)
    .bind(c.get('userId'), profile.resume, JSON.stringify(profile.filters))
    .run()

  return c.json(profile)
})
