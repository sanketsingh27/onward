import { verifyToken } from '@clerk/backend'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { ApiEnv } from './api/types'
import { openingsRoutes } from './routes/openings'
import { profileRoutes } from './routes/profile'
import { operationRoutes } from './routes/operations'
import { stateRoutes } from './routes/state'

const app = new Hono<ApiEnv>()
app.use('*', cors())
app.use('*', async (c, next) => {
  const requestId = c.req.header('x-request-id') || crypto.randomUUID()
  c.header('x-request-id', requestId)
  const startedAt = Date.now()
  await next()
  if (c.env.ENVIRONMENT === 'development') {
    console.log(JSON.stringify({
      event: 'http_request',
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - startedAt,
    }))
  }
})

app.onError((error, c) => {
  const requestId = c.res.headers.get('x-request-id') ?? 'unknown'
  console.error(JSON.stringify({
    event: 'http_request_failed',
    requestId,
    method: c.req.method,
    path: c.req.path,
    error: error instanceof Error ? error.message : 'unknown error',
  }))
  return c.json({ error: 'internal server error', requestId }, 500)
})

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
app.route('/', openingsRoutes)
app.route('/', profileRoutes)
app.route('/', stateRoutes)
app.route('/', operationRoutes)

export default {
  fetch: app.fetch,
}
