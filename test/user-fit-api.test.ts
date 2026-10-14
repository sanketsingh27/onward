import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import worker from '../worker/src/index.ts'
import { ingestBoards } from '../worker/src/ingest/ingest.ts'
import { getOrCreateResumeEmbedding } from '../worker/src/embed/embed.ts'

const ashbyFixture = JSON.parse(readFileSync(new URL('../fixtures/ashby-sample.json', import.meta.url), 'utf8'))

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })

function makeDatabase() {
  const db = new DatabaseSync(':memory:')
  const migrationFiles = ['0002_app.sql', '0003_vectors.sql', '0004_profile.sql', '0005_scans.sql', '0006_resume_embeddings.sql', '0007_user_opening_fits.sql', '0008_dynamic_opening_results.sql', '0009_profile_user_ids.sql']
  for (let run = 0; run < 2; run += 1) {
    for (const file of migrationFiles) {
      db.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'))
    }
  }
  const filters = JSON.stringify({
    remote: 'Remote only',
    locations: [],
    compFloorUsd: 0,
    compFloorInr: 0,
    employmentType: 'Full-time',
    seniority: 'Senior+',
    excludeTerms: [],
  })
  db.prepare('INSERT INTO profile (user_id, resume, filters) VALUES (?,?,?)').run('user-a', 'Resume A', filters)
  db.prepare('INSERT INTO profile (user_id, resume, filters) VALUES (?,?,?)').run('user-b', 'Resume B', filters)

  const insertOpening = db.prepare(`INSERT INTO openings
    (id, board, company, title, location, secondary_locations, remote, currency,
     salary_min, salary_max, equity_min, equity_max, bonus, employment_type,
     published_at, apply_url, description_plain)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  for (const [id, title, remote] of [
    ['opening-available', 'Senior Platform Engineer', 'Remote'],
    ['opening-applied', 'Senior Backend Engineer', 'Remote'],
    ['opening-dismissed', 'Senior Software Engineer', 'Remote'],
    ['opening-onsite', 'Senior Distributed Systems Engineer', 'Onsite'],
  ]) {
    insertOpening.run(id, 'board', 'Company', title, 'Remote', '[]', remote, 'USD', 0, 0, null, null, 0, 'FullTime', '', 'https://apply.test', '')
  }

  const insertState = db.prepare('INSERT INTO state (user_id, opening_id, status, updated_at) VALUES (?,?,?,?)')
  insertState.run('user-a', 'opening-applied', 'applied', '2026-01-01T00:00:00.000Z')
  insertState.run('user-a', 'opening-dismissed', 'dismissed', '2026-01-02T00:00:00.000Z')

  return db
}

function makeD1(db: DatabaseSync) {
  return {
    prepare(sql: string) {
      const statement = db.prepare(sql)
      return {
        bind(...params: unknown[]) {
          // Match the platform limit that SQLite's default build does not enforce.
          if (params.length > 100) throw new Error('D1_ERROR: too many SQL variables')
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

test('Opening APIs calculate dynamic Fits for available Openings and return acted-on history', async () => {
  const db = makeDatabase()
  const env = {
    APP_DB: makeD1(db),
    BOARD_DB: makeD1(db),
    AI: {
      run: async (_model: string, input: { text: string[] }) => ({ data: input.text.map(() => [1, 0]) }),
    },
    VECTORIZE: {
      query: async () => ({
        matches: [
          { id: 'opening-applied', score: 0.99 },
          { id: 'opening-onsite', score: 0.98 },
          { id: 'opening-available', score: 0.91 },
          { id: 'opening-dismissed', score: 0.90 },
        ],
      }),
    },
    CLERK_JWT_KEY: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
    CLERK_AUTHORIZED_PARTIES: 'https://onward.test',
  } as never

  try {
    const available = await worker.fetch(new Request('https://onward.test/openings?limit=10', {
      headers: { Authorization: `Bearer ${token('user-a')}` },
    }), env, {} as never)
    assert.equal(available.status, 200)
    assert.deepEqual(
      (await available.json() as Array<{ id: string; fit: number }>).map(({ id, fit }) => ({ id, fit })),
      [{ id: 'opening-available', fit: 91 }],
    )

    const history = await worker.fetch(new Request('https://onward.test/openings/history?limit=10', {
      headers: { Authorization: `Bearer ${token('user-a')}` },
    }), env, {} as never)
    assert.equal(history.status, 200)
    assert.deepEqual(
      (await history.json() as { data: Array<{ id: string; state: string }>; nextCursor: string | null }).data
        .map(({ id, state }) => ({ id, state })),
      [
        { id: 'opening-dismissed', state: 'dismissed' },
        { id: 'opening-applied', state: 'applied' },
      ],
    )

    const firstHistoryPage = await worker.fetch(new Request('https://onward.test/openings/history?limit=1', {
      headers: { Authorization: `Bearer ${token('user-a')}` },
    }), env, {} as never)
    const firstHistoryBody = await firstHistoryPage.json() as { data: Array<{ id: string }>; nextCursor: string | null }
    assert.deepEqual(firstHistoryBody.data.map(({ id }) => id), ['opening-dismissed'])
    assert.equal(firstHistoryBody.nextCursor, '2')

    const secondHistoryPage = await worker.fetch(new Request(`https://onward.test/openings/history?limit=1&cursor=${firstHistoryBody.nextCursor}`, {
      headers: { Authorization: `Bearer ${token('user-a')}` },
    }), env, {} as never)
    assert.deepEqual(
      (await secondHistoryPage.json() as { data: Array<{ id: string }> }).data.map(({ id }) => id),
      ['opening-applied'],
    )

  } finally {
    db.close()
  }
})

test('cached Opening source recovers a failed index and becomes an authenticated recommendation without a feed refetch', async () => {
  const db = makeDatabase()
  db.exec('DELETE FROM state; DELETE FROM openings; DELETE FROM opening_embeddings;')
  const vectors = new Map<string, number[]>()
  let upserts = 0
  let failIndex = true
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('cached source must not refetch its Board') }
  const env = {
    APP_DB: makeD1(db),
    BOARD_DB: {
      prepare: () => ({ all: async () => ({ results: [{ slug: 'openai', company_name: 'OpenAI', feed_url: 'https://feed.test' }] }) }),
    },
    AI: { run: async (_model: string, input: { text: string[] }) => ({ data: input.text.map(() => [1, 0]) }) },
    VECTORIZE: {
      upsert: async (entries: Array<{ id: string; values: number[] }>) => {
        upserts += 1
        if (failIndex) throw new Error('temporary Vectorize failure')
        for (const entry of entries) vectors.set(entry.id, entry.values)
      },
      getByIds: async (ids: string[]) => ids.filter((id) => vectors.has(id)).map((id) => ({ id, values: vectors.get(id) })),
      deleteByIds: async () => {},
      query: async () => ({ matches: [...vectors.keys()].map((id) => ({ id, score: 0.91 })) }),
    },
    CLERK_JWT_KEY: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
    CLERK_AUTHORIZED_PARTIES: 'https://onward.test',
  } as never

  try {
    await ingestBoards(env, { cachedBoards: new Map([['openai', ashbyFixture]]), verifyIndex: true })
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM opening_embeddings').get().count, 0)

    failIndex = false
    await ingestBoards(env, { cachedBoards: new Map([['openai', ashbyFixture]]), verifyIndex: true })
    const response = await worker.fetch(new Request('https://onward.test/openings', {
      headers: { Authorization: `Bearer ${token('user-a')}` },
    }), env, {} as never)
    assert.deepEqual((await response.json() as Array<{ id: string }>).map(({ id }) => id), ['openai:1'])
    assert.equal(upserts, 2, 'the retry indexes cached source instead of refetching the Board')

    vectors.clear()
    await ingestBoards(env, { cachedBoards: new Map([['openai', ashbyFixture]]), verifyIndex: true })
    const repaired = await worker.fetch(new Request('https://onward.test/openings', {
      headers: { Authorization: `Bearer ${token('user-a')}` },
    }), env, {} as never)
    assert.deepEqual((await repaired.json() as Array<{ id: string }>).map(({ id }) => id), ['openai:1'])
  } finally {
    globalThis.fetch = originalFetch
    db.close()
  }
})

test('full Recall hydrates 100 candidates within D1 limits and excludes only this user’s acted-on Openings', async () => {
  const db = makeDatabase()
  const ids = Array.from({ length: 100 }, (_, index) => `boundary-${index}`)
  try {
    const copyOpening = db.prepare(`INSERT INTO openings
      (id, board, company, title, location, secondary_locations, remote, currency,
       salary_min, salary_max, equity_min, equity_max, bonus, employment_type,
       published_at, apply_url, description_plain)
      SELECT ?, board, company, title, location, secondary_locations, remote, currency,
       salary_min, salary_max, equity_min, equity_max, bonus, employment_type,
       published_at, apply_url, description_plain FROM openings WHERE id = 'opening-available'`)
    for (const id of ids) copyOpening.run(id)
    const state = db.prepare('INSERT INTO state (user_id, opening_id, status, updated_at) VALUES (?,?,?,?)')
    state.run('user-a', ids[99], 'applied', '2026-10-14T00:00:00Z')
    state.run('user-b', ids[0], 'dismissed', '2026-10-14T00:00:00Z')
    const env = {
      APP_DB: makeD1(db),
      AI: { run: async () => ({ data: [[1, 0]] }) },
      VECTORIZE: { query: async () => ({ matches: ids.map((id, index) => ({ id, score: 1 - index / 1000 })) }) },
      CLERK_JWT_KEY: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
      CLERK_AUTHORIZED_PARTIES: 'https://onward.test',
    } as never
    const response = await worker.fetch(new Request('https://onward.test/openings?limit=100', {
      headers: { Authorization: `Bearer ${token('user-a')}` },
    }), env, {} as never)
    assert.equal(response.status, 200)
    assert.deepEqual((await response.json() as Array<{ id: string }>).map((opening) => opening.id), ids.slice(0, 99))
  } finally {
    db.close()
  }
})

test('cached source completes index verification above the Vectorize retrieval limit without re-embedding', async () => {
  const db = makeDatabase()
  db.exec('DELETE FROM state; DELETE FROM openings; DELETE FROM opening_embeddings;')
  const jobs = Array.from({ length: 21 }, (_, index) => ({
    ...ashbyFixture.jobs[0], jobUrl: `https://jobs.ashbyhq.com/openai/read-boundary-${index}`,
  }))
  const ids = jobs.map((_, index) => `openai:read-boundary-${index}`)
  const vectors = new Map<string, number[]>()
  let initial = true
  const env = {
    APP_DB: makeD1(db),
    BOARD_DB: { prepare: () => ({ all: async () => ({ results: [{ slug: 'openai', company_name: 'OpenAI', feed_url: 'https://unused.test' }] }) }) },
    AI: { run: async (_model: string, input: { text: string[] }) => {
      if (!initial) throw new Error('unchanged cached Openings must not require new Embeddings')
      return { data: input.text.map(() => [1, 0]) }
    } },
    VECTORIZE: {
      upsert: async (entries: Array<{ id: string; values: number[] }>) => { for (const entry of entries) vectors.set(entry.id, entry.values) },
      getByIds: async (requested: string[]) => {
        if (requested.length > 20) throw new Error('VECTOR_GET_ERROR: maximum id count is 20')
        return requested.filter((id) => vectors.has(id)).map((id) => ({ id, values: vectors.get(id) }))
      },
      query: async () => ({ matches: ids.map((id) => ({ id, score: 0.9 })) }),
    },
    CLERK_JWT_KEY: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
    CLERK_AUTHORIZED_PARTIES: 'https://onward.test',
  } as never
  try {
    const options = { cachedBoards: new Map([['openai', { jobs }]]), verifyIndex: true, retireVectors: false }
    await ingestBoards(env, options)
    await getOrCreateResumeEmbedding(env, 'user-a', 'Resume A')
    initial = false
    const outcomes = await ingestBoards(env, options)
    assert.deepEqual(outcomes, [{ board: 'openai', ok: true, openings: 21 }])
    const response = await worker.fetch(new Request('https://onward.test/openings', {
      headers: { Authorization: `Bearer ${token('user-a')}` },
    }), env, {} as never)
    assert.deepEqual((await response.json() as Array<{ id: string }>).map((opening) => opening.id), ids)
  } finally {
    db.close()
  }
})
