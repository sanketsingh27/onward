import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { getOrCreateResumeEmbedding } from '../worker/src/embed/embed.ts'

function makeHarness() {
  const db = new DatabaseSync(':memory:')
  db.exec(readFileSync(new URL('../migrations/0006_resume_embeddings.sql', import.meta.url), 'utf8'))

  let embeddingCalls = 0
  const env = {
    APP_DB: {
      prepare: (sql: string) => {
        const statement = db.prepare(sql)
        let params: string[] = []
        const bound = {
          bind: (...values: string[]) => {
            params = values
            return bound
          },
          first: async () => statement.get(...params) ?? null,
          run: async () => statement.run(...params),
        }
        return bound
      },
    },
    AI: {
      run: async (_model: string, input: { text: string[] }) => {
        embeddingCalls += input.text.length
        return { data: input.text.map((text) => [text.length, embeddingCalls]) }
      },
    },
  } as never

  return { db, env, get embeddingCalls() { return embeddingCalls } }
}

test('Resume embeddings are isolated per Profile and reused until that Resume changes', async () => {
  const harness = makeHarness()
  try {
    const firstA = await getOrCreateResumeEmbedding(harness.env, 'user-a', 'Resume A')
    const firstB = await getOrCreateResumeEmbedding(harness.env, 'user-b', 'Resume B')
    assert.notDeepEqual(firstA, firstB)
    assert.equal(harness.embeddingCalls, 2)
    assert.deepEqual(await getOrCreateResumeEmbedding(harness.env, 'user-a', 'Resume A'), firstA)
    assert.equal(harness.embeddingCalls, 2, 'unchanged Resume reuses the stored embedding')

    const updatedA = await getOrCreateResumeEmbedding(harness.env, 'user-a', 'Updated Resume A')
    assert.notDeepEqual(updatedA, firstA)
    assert.deepEqual(await getOrCreateResumeEmbedding(harness.env, 'user-b', 'Resume B'), firstB)
    assert.equal(harness.embeddingCalls, 3, 'only the changed Resume is re-embedded')

    const saved = harness.db.prepare('SELECT user_id, resume_hash, vector FROM resume_embeddings ORDER BY user_id').all() as Array<{ user_id: string; resume_hash: string; vector: string }>
    assert.equal(saved.length, 2)
    assert.deepEqual(saved.map((row) => row.user_id), ['user-a', 'user-b'])
    assert.notEqual(saved[0].resume_hash, saved[1].resume_hash)
    assert.notDeepEqual(JSON.parse(saved[0].vector), JSON.parse(saved[1].vector))
  } finally {
    harness.db.close()
  }
})
