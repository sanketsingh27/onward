import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import worker from '../worker/src/index.ts'
import { bootstrapDevelopmentProfile } from '../scripts/development-profile-bootstrap.ts'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })

function makeD1(db: DatabaseSync) {
  return {
    prepare(sql: string) {
      const statement = db.prepare(sql)
      const bound = (...params: unknown[]) => ({
        async all() { return { results: statement.all(...params) } },
        async first() { return statement.get(...params) ?? null },
        async run() { return statement.run(...params) },
      })
      return { ...bound(), bind: bound }
    },
  }
}

function token(userId: string): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const body = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ sub: userId, sid: 'sess_test', iss: 'https://clerk.test', azp: 'https://onward.test', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300 })}`
  return `${body}.${sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64url')}`
}

function profileRequest(env: never, userId: string, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${token(userId)}`)
  return worker.fetch(new Request('https://onward.test/profile', { ...init, headers }), env, {} as never)
}

test('development Profile bootstrap assigns the resolved Clerk owner and preserves a later authenticated Profile edit', async () => {
  const db = new DatabaseSync(':memory:')
  let accountLookups = 0
  try {
    for (const migration of ['0002_app.sql', '0004_profile.sql', '0006_resume_embeddings.sql', '0009_profile_user_ids.sql', '0010_clerk_user_ids.sql']) {
      db.exec(readFileSync(new URL(`../migrations/${migration}`, import.meta.url), 'utf8'))
    }
    const env = {
      APP_DB: makeD1(db),
      AI: { async run() { return { data: [[0.1, 0.2, 0.3]] } } },
      CLERK_JWT_KEY: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
      CLERK_AUTHORIZED_PARTIES: 'https://onward.test',
    } as never
    const sourceResume = '  Taylor Example | https://linkedin.example/taylor | taylor@example.com | +1 555 0100\nSenior TypeScript engineer.  '

    await bootstrapDevelopmentProfile({
      env,
      resume: sourceResume,
      resolveAccount: async () => {
        accountLookups += 1
        return { id: 'user_clerk_123', email: 'taylor@example.com', name: 'Taylor Example' }
      },
    })

    const seeded = await profileRequest(env, 'user_clerk_123')
    assert.equal(seeded.status, 200)
    const seededProfile = await seeded.json()
    assert.equal(seededProfile.resume, 'Taylor Example | https://linkedin.example/taylor | taylor@example.com | +1 555 0100\nSenior TypeScript engineer.')
    assert.equal((await profileRequest(env, 'user_other')).status, 404)

    const edited = {
      resume: 'Taylor now prefers staff-level platform work.',
      filters: {
        remote: 'Hybrid ok', locations: ['Bengaluru'], compFloorUsd: 200000, compFloorInr: 0,
        employmentType: 'Full-time', seniority: 'Staff+', excludeTerms: ['on-call only'],
      },
    }
    assert.equal((await profileRequest(env, 'user_clerk_123', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edited),
    })).status, 200)

    await bootstrapDevelopmentProfile({
      env,
      resume: 'Different seed input must not replace the saved Profile.',
      resolveAccount: async () => {
        throw new Error('a saved local account mapping should avoid another Clerk lookup')
      },
    })

    assert.deepEqual(await (await profileRequest(env, 'user_clerk_123')).json(), edited)
    assert.equal(accountLookups, 1)
  } finally {
    db.close()
  }
})
