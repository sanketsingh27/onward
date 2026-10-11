import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import worker from '../worker/src/index.ts'

const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const env = {
  APP_DB: {
    prepare: () => ({
      bind: () => ({
        all: async () => ({ results: [] }),
        run: async () => ({ success: true }),
      }),
    }),
  },
  CLERK_JWT_KEY: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
  CLERK_AUTHORIZED_PARTIES: 'https://onward.test',
} as never

async function request(path: string, init?: RequestInit): Promise<Response> {
  return worker.fetch(new Request(`https://onward.test${path}`, init), env, {} as never)
}

test('a request without a verified identity cannot read available Openings', async () => {
  const response = await request('/openings')

  assert.equal(response.status, 401)
})

test('a forged bearer credential cannot read available Openings', async () => {
  const response = await request('/openings', {
    headers: { Authorization: 'Bearer not-a-valid-clerk-token' },
  })

  assert.equal(response.status, 401)
})

test('a client-supplied user ID cannot authorize an Opening State write', async () => {
  const response = await request('/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: 987, opening_id: 'opening-1', status: 'saved' }),
  })

  assert.equal(response.status, 401)
})

test('the health endpoint remains available without sign-in', async () => {
  const response = await request('/health')

  assert.equal(response.status, 200)
})
