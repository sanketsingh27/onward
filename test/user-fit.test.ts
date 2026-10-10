import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { replaceUserFits, OPENINGS_FOR_USER, RANKED_OPENINGS_FOR_USER } from '../worker/src/fit/fit.ts'

function makeDb() {
  const db = new DatabaseSync(':memory:')
  db.exec(readFileSync(new URL('../migrations/0002_app.sql', import.meta.url), 'utf8'))
  db.exec(readFileSync(new URL('../migrations/0004_profile.sql', import.meta.url), 'utf8'))
  db.prepare('INSERT INTO profile (user_id, resume, filters) VALUES (?,?,?)').run(1, 'Existing Resume', '{}')
  db.prepare('INSERT INTO openings (id, title, fit) VALUES (?,?,?)').run('job-a', 'Opening A', 99)
  db.prepare('INSERT INTO openings (id, title, fit) VALUES (?,?,?)').run('job-b', 'Opening B', 88)
  db.prepare('INSERT INTO openings (id, title, fit) VALUES (?,?,?)').run('job-c', 'Opening C', 77)
  db.prepare('INSERT INTO state (user_id, opening_id, status, updated_at) VALUES (?,?,?,?)').run('user-a', 'job-b', 'applied', 't1')
  db.prepare('INSERT INTO state (user_id, opening_id, status, updated_at) VALUES (?,?,?,?)').run('user-b', 'job-a', 'dismissed', 't1')
  db.exec(readFileSync(new URL('../migrations/0007_user_opening_fits.sql', import.meta.url), 'utf8'))
  return db
}

function makeEnv(db: DatabaseSync) {
  return {
    APP_DB: {
      prepare: (sql: string) => {
        const statement = db.prepare(sql)
        return {
          bind: (...args: unknown[]) => ({ run: async () => statement.run(...args) }),
        }
      },
      batch: async (statements: Array<{ run: () => Promise<unknown> }>) => Promise.all(statements.map((statement) => statement.run())),
    },
  } as never
}

test('Fit and ranked Openings are isolated by user and stale Fit is replaced', async () => {
  const db = makeDb()
  try {
    const env = makeEnv(db)
    const selectScores = (sql: string, ...params: string[]) => {
      const rows = db.prepare(sql).all(...params) as Array<{ id: string; fit: number }>
      return rows.map(({ id, fit }) => ({ id, fit }))
    }
    assert.deepEqual(selectScores(OPENINGS_FOR_USER, 'unscored-user'), [])
    const clearedLegacyFit = db.prepare("SELECT fit FROM openings WHERE id = 'job-a'").get() as { fit: number | null }
    assert.equal(clearedLegacyFit.fit, null)
    await replaceUserFits(env, 'user-a', [
      { openingId: 'job-a', fit: 90 },
      { openingId: 'job-b', fit: 80 },
      { openingId: 'job-c', fit: 60 },
    ])
    await replaceUserFits(env, 'user-b', [
      { openingId: 'job-a', fit: 50 },
      { openingId: 'job-b', fit: 95 },
      { openingId: 'job-c', fit: 70 },
    ])

    assert.deepEqual(selectScores(RANKED_OPENINGS_FOR_USER, 'user-a', 'user-a'), [
      { id: 'job-a', fit: 90 }, { id: 'job-c', fit: 60 },
    ])
    assert.deepEqual(selectScores(RANKED_OPENINGS_FOR_USER, 'user-b', 'user-b'), [
      { id: 'job-b', fit: 95 }, { id: 'job-c', fit: 70 },
    ])

    await replaceUserFits(env, 'user-a', [{ openingId: 'job-c', fit: 100 }])
    assert.deepEqual(selectScores(OPENINGS_FOR_USER, 'user-a'), [{ id: 'job-c', fit: 100 }])
    assert.deepEqual(selectScores(OPENINGS_FOR_USER, 'user-b'), [
      { id: 'job-b', fit: 95 }, { id: 'job-c', fit: 70 }, { id: 'job-a', fit: 50 },
    ])
    const stateCount = db.prepare("SELECT COUNT(*) AS count FROM state WHERE user_id = 'user-a'").get() as { count: number }
    assert.equal(stateCount.count, 1)
    const profile = db.prepare('SELECT user_id, resume FROM profile').get() as { user_id: string; resume: string }
    assert.equal(profile.user_id, '1')
    assert.equal(profile.resume, 'Existing Resume')
    db.exec(readFileSync(new URL('../migrations/0007_user_opening_fits.sql', import.meta.url), 'utf8'))
    assert.deepEqual(selectScores(OPENINGS_FOR_USER, 'user-b'), [
      { id: 'job-b', fit: 95 }, { id: 'job-c', fit: 70 }, { id: 'job-a', fit: 50 },
    ])
  } finally {
    db.close()
  }
})
