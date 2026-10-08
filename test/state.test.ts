import { test } from 'node:test'
import assert from 'node:assert'
import { DatabaseSync } from 'node:sqlite'
import { UPSERT_STATE, SELECT_STATE, isValidStatus } from '../worker/src/state/state.ts'

function makeDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:')
  db.exec(
    'CREATE TABLE state (id INTEGER PRIMARY KEY, user_id INTEGER, opening_id TEXT, status TEXT, updated_at TEXT, UNIQUE(user_id, opening_id))',
  )
  return db
}

test('upserts and overrides the status for the same opening', () => {
  const db = makeDb()
  const upsert = db.prepare(UPSERT_STATE)
  upsert.run(1, 'openai-1', 'applied', 't1')
  upsert.run(1, 'openai-1', 'dismissed', 't2')
  const rows = db.prepare(SELECT_STATE).all(1) as { status: string }[]
  assert.equal(rows.length, 1)
  assert.equal(rows[0].status, 'dismissed')
})

test('separates state per user', () => {
  const db = makeDb()
  const upsert = db.prepare(UPSERT_STATE)
  upsert.run(1, 'openai-1', 'applied', 't1')
  upsert.run(2, 'openai-1', 'dismissed', 't1')
  assert.equal((db.prepare(SELECT_STATE).all(1) as unknown[]).length, 1)
  assert.equal((db.prepare(SELECT_STATE).all(2) as unknown[]).length, 1)
})

test('validates the status vocabulary', () => {
  assert.ok(isValidStatus('applied'))
  assert.ok(isValidStatus('saved'))
  assert.ok(isValidStatus('dismissed'))
  assert.ok(!isValidStatus('bogus'))
})
