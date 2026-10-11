import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import worker from '../worker/src/index.ts'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const states = {
  user_verified: [{ user_id: 'user_verified', opening_id: 'opening-private', status: 'saved' }],
  user_attacker: [{ user_id: 'user_attacker', opening_id: 'opening-other', status: 'applied' }],
}
const env = {
  APP_DB: {
    prepare: () => ({ bind: (id: string) => ({ all: async () => ({ results: states[id as keyof typeof states] ?? [] }), run: async () => ({ success: true }) }) }),
  },
  CLERK_JWT_KEY: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
  CLERK_AUTHORIZED_PARTIES: 'https://onward.test',
} as never

function sessionToken(subject: string): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const body = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ sub: subject, sid: 'sess_test', iss: 'https://clerk.test', azp: 'https://onward.test', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300 })}`
  return `${body}.${sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64url')}`
}

function request(path: string, subject: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${sessionToken(subject)}`)
  return worker.fetch(new Request(`https://onward.test${path}`, { ...init, headers }), env, {} as never)
}


test('browser preflight permits the Authorization header required by the session', async () => {
  const response = await worker.fetch(new Request('https://onward.test/openings', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://dashboard.test',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization',
    },
  }), env, {} as never)
  assert.equal(response.status, 204)
  assert.match(response.headers.get('Access-Control-Allow-Headers') ?? '', /authorization/i)
})
test('a signed-in user reads State for the verified identity, not a query user ID', async () => {
  const response = await request('/state?user=user_attacker', 'user_verified')
  assert.deepEqual(await response.json(), states.user_verified)
})
