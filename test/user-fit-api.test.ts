import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import worker from '../worker/src/index.ts'

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

    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'user_opening_fits'").get().count, 0)
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM pragma_table_info('openings') WHERE name = 'fit'").get().count, 0)
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'opening_embeddings'").get().count, 1)
  } finally {
    db.close()
  }
})
