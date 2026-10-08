import { test } from 'node:test'
import assert from 'node:assert'
import { DatabaseSync } from 'node:sqlite'
import { UPSERT_VECTOR, SELECT_VECTOR } from '../worker/src/embed/embed.ts'

function makeDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:')
  db.exec('CREATE TABLE vectors (key TEXT PRIMARY KEY, vector TEXT NOT NULL)')
  return db
}

test('stores and retrieves a vector by key', () => {
  const db = makeDb()
  const upsert = db.prepare(UPSERT_VECTOR)
  upsert.run('openai-1', JSON.stringify([0.1, 0.2, 0.3]))
  upsert.run('resume', JSON.stringify([0.9, 0.8, 0.7]))
  const row = db.prepare(SELECT_VECTOR).get('openai-1') as { vector: string }
  assert.deepEqual(JSON.parse(row.vector), [0.1, 0.2, 0.3])
})

test('overwrites a vector on re-store', () => {
  const db = makeDb()
  const upsert = db.prepare(UPSERT_VECTOR)
  upsert.run('openai-1', JSON.stringify([1, 2, 3]))
  upsert.run('openai-1', JSON.stringify([4, 5, 6]))
  const row = db.prepare(SELECT_VECTOR).get('openai-1') as { vector: string }
  assert.deepEqual(JSON.parse(row.vector), [4, 5, 6])
})
