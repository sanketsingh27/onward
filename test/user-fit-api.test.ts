import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import worker from '../worker/src/index.ts'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })

function makeDatabase() {
  const db = new DatabaseSync(':memory:')
  for (const file of ['0002_app.sql', '0003_vectors.sql', '0004_profile.sql', '0005_scans.sql', '0006_resume_embeddings.sql', '0007_user_opening_fits.sql']) {
    db.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'))
  }
  db.exec('CREATE TABLE boards (slug TEXT, company_name TEXT, feed_url TEXT)')
  const filters = JSON.stringify({ remote: 'Remote only', locations: [], compFloorUsd: 0, compFloorInr: 0, employmentType: 'Full-time', seniority: 'Mid', excludeTerms: [] })
  const insertProfile = db.prepare('INSERT INTO profile (user_id, resume, filters) VALUES (?,?,?)')
  insertProfile.run('user-a', 'Resume A', filters)
  insertProfile.run('user-b', 'Resume B', filters)
  const insertOpening = db.prepare(`INSERT INTO openings
    (id, board, company, title, location, secondary_locations, remote, currency,
     salary_min, salary_max, equity_min, equity_max, bonus, employment_type,
     published_at, apply_url, description_plain, reason)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  for (const [id, title] of [['job-a', 'Senior Software Engineer A'], ['job-b', 'Senior Software Engineer B']]) {
    insertOpening.run(id, 'board', 'Company', title, 'Remote', '[]', 'Remote', 'USD', 0, 0, null, null, 0, 'FullTime', '', 'https://apply.test', '', null)
  }
  const insertFit = db.prepare('INSERT INTO user_opening_fits (user_id, opening_id, fit) VALUES (?,?,?)')
  for (const fit of [['user-a', 'job-a', 90], ['user-a', 'job-b', 80], ['user-b', 'job-a', 50], ['user-b', 'job-b', 95]]) insertFit.run(...fit)
  const insertState = db.prepare('INSERT INTO state (user_id, opening_id, status, updated_at) VALUES (?,?,?,?)')
  insertState.run('user-a', 'job-b', 'applied', 't1')
  insertState.run('user-b', 'job-a', 'dismissed', 't1')
  return db
}

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
        async all() { return { results: statement.all() } },
        async first() { return statement.get() ?? null },
        async run() { return statement.run() },
      }
    },
    async batch(statements: Array<{ run: () => Promise<unknown> }>) {
      return Promise.all(statements.map((statement) => statement.run()))
    },
  }
}

function token(userId: string): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const body = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ sub: userId, sid: 'sess_test', iss: 'https://clerk.test', azp: 'https://onward.test', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300 })}`
  return `${body}.${sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64url')}`
}

test('authenticated Opening APIs return only the caller’s Fit and State-filtered ranking', async () => {
  const db = makeDatabase()
  const env = {
    APP_DB: makeD1(db),
    BOARD_DB: makeD1(db),
    CLERK_JWT_KEY: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
    CLERK_AUTHORIZED_PARTIES: 'https://onward.test',
  } as never
  try {
    for (const userId of ['user-a', 'user-b']) {
      const response = await worker.fetch(new Request('https://onward.test/openings/ranked', {
        headers: { Authorization: `Bearer ${token(userId)}` },
      }), env, {} as never)
      assert.equal(response.status, 200)
      const openings = await response.json() as Array<{ id: string; fit: number }>
      if (userId === 'user-a') assert.deepEqual(openings.map(({ id, fit }) => ({ id, fit })), [{ id: 'job-a', fit: 90 }])
      else assert.deepEqual(openings.map(({ id, fit }) => ({ id, fit })), [{ id: 'job-b', fit: 95 }])
    }
  } finally {
    db.close()
  }
})
test('each Scan stores independent Fit for the same Openings', async () => {
  const db = makeDatabase()
  const openingVectors = new Map<string, number[]>()
  const env = {
    APP_DB: makeD1(db),
    BOARD_DB: makeD1(db),
    AI: {
      run: async (_model: string, input: { text?: string[]; messages?: unknown[] }) => {
        if (input.text) {
          return { data: input.text.map((text) => text === 'Resume A' ? [1, 0] : text === 'Resume B' ? [0, 1] : [0.5, 0.5]) }
        }
        return { response: 'Relevant experience.' }
      },
    },
    VECTORIZE: {
      upsert: async (entries: Array<{ id: string; values: number[] }>) => {
        for (const entry of entries) openingVectors.set(entry.id, entry.values)
      },
      query: async (vector: number[], options: { topK: number }) => {
        const scores = vector[0] === 1 ? { 'job-a': 0.92, 'job-b': 0.31 } : { 'job-a': 0.24, 'job-b': 0.95 }
        const matches = [...openingVectors.keys()]
          .map((id) => ({ id, score: scores[id as keyof typeof scores] }))
          .sort((a, b) => b.score - a.score)
          .slice(0, options.topK)
        return { matches }
      },
    },
    CLERK_JWT_KEY: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
    CLERK_AUTHORIZED_PARTIES: 'https://onward.test',
  } as never
  try {
    await worker.queue({
      messages: [
        { body: { jobId: 'scan-a', userId: 'user-a' } },
        { body: { jobId: 'scan-b', userId: 'user-b' } },
      ],
    } as never, env, {} as never)
    for (const userId of ['user-a', 'user-b']) {
      const response = await worker.fetch(new Request('https://onward.test/openings', {
        headers: { Authorization: `Bearer ${token(userId)}` },
      }), env, {} as never)
      const openings = await response.json() as Array<{ id: string; fit: number }>
      if (userId === 'user-a') assert.deepEqual(openings.map(({ id, fit }) => ({ id, fit })), [{ id: 'job-a', fit: 92 }, { id: 'job-b', fit: 31 }])
      else assert.deepEqual(openings.map(({ id, fit }) => ({ id, fit })), [{ id: 'job-b', fit: 95 }, { id: 'job-a', fit: 24 }])
    }
    const contractFilters = JSON.stringify({ remote: 'Remote only', locations: [], compFloorUsd: 0, compFloorInr: 0, employmentType: 'Contract', seniority: 'Mid', excludeTerms: [] })
    db.prepare("UPDATE profile SET filters = ? WHERE user_id = 'user-a'").run(contractFilters)
    await worker.queue({ messages: [{ body: { jobId: 'scan-a2', userId: 'user-a' } }] } as never, env, {} as never)
    const emptyA = await worker.fetch(new Request('https://onward.test/openings', {
      headers: { Authorization: `Bearer ${token('user-a')}` },
    }), env, {} as never)
    assert.deepEqual(await emptyA.json(), [])
    const unchangedB = await worker.fetch(new Request('https://onward.test/openings', {
      headers: { Authorization: `Bearer ${token('user-b')}` },
    }), env, {} as never)
    const openingsB = await unchangedB.json() as Array<{ id: string; fit: number }>
    assert.deepEqual(openingsB.map(({ id, fit }) => ({ id, fit })), [
      { id: 'job-b', fit: 95 }, { id: 'job-a', fit: 24 },
    ])
  } finally {
    db.close()
  }
})
