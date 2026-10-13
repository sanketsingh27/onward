import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import worker from '../worker/src/index.ts'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })

function makeD1(db: DatabaseSync) {
  return {
    prepare(sql: string) {
      const statement = db.prepare(sql)
      return {
        bind(...params: unknown[]) {
          return {
            async all() { return { results: statement.all(...params) } },
            async first() { return statement.get(...params) ?? null },
            async run() { return statement.run(...params) },
          }
        },
      }
    },
  }
}

function token(userId: string): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const body = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ sub: userId, sid: 'sess_test', iss: 'https://clerk.test', azp: 'https://onward.test', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300 })}`
  return `${body}.${sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64url')}`
}

function request(env: never, path: string, userId: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${token(userId)}`)
  return worker.fetch(new Request(`https://onward.test${path}`, { ...init, headers }), env, {} as never)
}

function makeEnvironment() {
  const db = new DatabaseSync(':memory:')
  for (const migration of ['0004_profile.sql', '0009_profile_user_ids.sql']) {
    db.exec(readFileSync(new URL(`../migrations/${migration}`, import.meta.url), 'utf8'))
  }

  return {
    db,
    env: {
      APP_DB: makeD1(db),
      CLERK_JWT_KEY: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
      CLERK_AUTHORIZED_PARTIES: 'https://onward.test',
    } as never,
  }
}

const profile = {
  resume: 'Senior TypeScript engineer with distributed systems experience.',
  filters: {
    remote: 'Remote only',
    locations: ['Remote'],
    compFloorUsd: 180000,
    compFloorInr: 0,
    employmentType: 'Full-time',
    seniority: 'Senior+',
    excludeTerms: ['security clearance'],
  },
}

test('an authenticated Clerk user can create and read only their profile', async () => {
  const { db, env } = makeEnvironment()
  try {
    const put = await request(env, '/profile', 'user_profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    assert.equal(put.status, 200)
    assert.deepEqual(await put.json(), profile)

    const own = await request(env, '/profile', 'user_profile')
    assert.equal(own.status, 200)
    assert.deepEqual(await own.json(), profile)

    const other = await request(env, '/profile', 'user_other')
    assert.equal(other.status, 404)
  } finally {
    db.close()
  }
})

test('a profile update replaces the authenticated user’s full profile', async () => {
  const { db, env } = makeEnvironment()
  try {
    const updated = {
      ...profile,
      resume: 'Staff engineer building search infrastructure.',
      filters: { ...profile.filters, seniority: 'Staff+' as const },
    }
    const response = await request(env, '/profile', 'user_profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    assert.equal(response.status, 200)

    const stored = await request(env, '/profile', 'user_profile')
    assert.deepEqual(await stored.json(), updated)
  } finally {
    db.close()
  }
})
