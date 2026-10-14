import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import worker from '../worker/src/index.ts'
import { bootstrapDevelopmentState } from '../scripts/development-state-bootstrap.ts'

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
    async batch(statements: Array<{ run: () => Promise<unknown> }>) {
      db.exec('BEGIN')
      try {
        const results = []
        for (const statement of statements) results.push(await statement.run())
        db.exec('COMMIT')
        return results
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },
  }
}

function token(userId: string): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const body = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ sub: userId, sid: 'sess_test', iss: 'https://clerk.test', azp: 'https://onward.test', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300 })}`
  return `${body}.${sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64url')}`
}

function request(env: never, path: string) {
  return worker.fetch(new Request(`https://onward.test${path}`, {
    headers: { Authorization: `Bearer ${token('user_clerk_123')}` },
  }), env, {} as never)
}

test('development State bootstrap seeds history once while authenticated State, history, and Recall retain deliberate later decisions', async () => {
  const db = new DatabaseSync(':memory:')
  try {
    for (const migration of ['0002_app.sql', '0004_profile.sql', '0006_resume_embeddings.sql', '0008_dynamic_opening_results.sql', '0009_profile_user_ids.sql', '0010_clerk_user_ids.sql', '0011_development_bootstrap_state.sql']) {
      db.exec(readFileSync(new URL(`../migrations/${migration}`, import.meta.url), 'utf8'))
    }
    const filters = JSON.stringify({
      remote: 'Remote only', locations: [], compFloorUsd: 0, compFloorInr: 0,
      employmentType: 'Full-time', seniority: 'Senior+', excludeTerms: [],
    })
    db.prepare('INSERT INTO users (id, email, name) VALUES (?,?,?)').run('user_clerk_123', 'taylor@example.com', 'Taylor Example')
    db.prepare('INSERT INTO profile (user_id, resume, filters) VALUES (?,?,?)').run('user_clerk_123', 'Taylor Resume', filters)
    const insertOpening = db.prepare(`INSERT INTO openings
      (id, board, company, title, location, secondary_locations, remote, currency,
       salary_min, salary_max, equity_min, equity_max, bonus, employment_type,
       published_at, apply_url, description_plain)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    for (const id of ['opening-saved', 'opening-available', 'opening-history-a', 'opening-history-b']) {
      const remote = id.startsWith('opening-history') ? 'Onsite' : 'Remote'
      insertOpening.run(id, 'board', 'Company', 'Senior Platform Engineer', 'Remote', '[]', remote, 'USD', 0, 0, null, null, 0, 'FullTime', '', 'https://apply.test', 'description')
      db.prepare('INSERT INTO opening_embeddings (opening_id, description_hash) VALUES (?,?)').run(id, createHash('sha256').update('description').digest('hex'))
    }

    let recalledIds = ['opening-saved']
    const env = {
      APP_DB: makeD1(db),
      AI: { async run(_model: string, input: { text: string[] }) { return { data: input.text.map(() => [1, 0]) } } },
      VECTORIZE: {
        query: async () => ({ matches: recalledIds.map((id, index) => ({ id, score: 1 - index / 10 })) }),
      },
      CLERK_JWT_KEY: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
      CLERK_AUTHORIZED_PARTIES: 'https://onward.test',
    } as never

    // A saved example alone would empty the Available tab: remain incomplete.
    assert.equal((await bootstrapDevelopmentState({ env, userId: 'user_clerk_123' })).complete, false)
    assert.deepEqual(await (await request(env, '/state')).json(), [])

    recalledIds = ['opening-saved', 'opening-available', 'opening-history-a', 'opening-history-b']
    db.exec(`CREATE TRIGGER reject_demo_decision BEFORE INSERT ON state WHEN NEW.status = 'dismissed'
      BEGIN SELECT RAISE(ABORT, 'simulated decision write failure'); END;`)
    await assert.rejects(bootstrapDevelopmentState({ env, userId: 'user_clerk_123' }), /simulated decision write failure/)
    assert.deepEqual(await (await request(env, '/state')).json(), [])
    db.exec('DROP TRIGGER reject_demo_decision')

    assert.equal((await bootstrapDevelopmentState({ env, userId: 'user_clerk_123' })).complete, true)
    const seeded = await request(env, '/state')
    assert.equal(seeded.status, 200)
    const seededStates = await seeded.json() as Array<{ opening_id: string; status: string }>
    assert.deepEqual(seededStates.map((state) => state.status).sort(), ['applied', 'dismissed', 'saved'])
    assert.equal(seededStates.find((state) => state.status === 'saved')?.opening_id, 'opening-saved')
    assert.deepEqual((await (await request(env, '/openings/history')).json() as { data: Array<{ state: string }> }).data.map((opening) => opening.state).sort(), ['applied', 'dismissed'])
    assert.deepEqual((await (await request(env, '/openings')).json() as Array<{ id: string }>).map((opening) => opening.id), ['opening-saved', 'opening-available'])
    const otherOwner = await worker.fetch(new Request('https://onward.test/state', {
      headers: { Authorization: `Bearer ${token('user_other')}` },
    }), env, {} as never)
    assert.deepEqual(await otherOwner.json(), [])

    db.prepare("DELETE FROM state WHERE user_id = ? AND status = 'saved'").run('user_clerk_123')
    db.prepare("UPDATE state SET status = 'saved' WHERE user_id = ? AND status = 'applied'").run('user_clerk_123')
    // Even when filters/Recall later return no results, deliberate decisions stay untouched.
    recalledIds = []
    assert.equal((await bootstrapDevelopmentState({ env, userId: 'user_clerk_123' })).complete, true)
    assert.deepEqual((await (await request(env, '/state')).json() as Array<{ status: string }>).map((state) => state.status).sort(), ['dismissed', 'saved'])
  } finally {
    db.close()
  }
})
