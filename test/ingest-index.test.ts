import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { ingestBoards } from '../worker/src/ingest/ingest.ts'

const fixture = JSON.parse(readFileSync(new URL('../fixtures/ashby-sample.json', import.meta.url), 'utf8'))

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
      }
    },
    async batch(statements: Array<{ run: () => Promise<unknown> }>) {
      return Promise.all(statements.map((statement) => statement.run()))
    },
  }
}

test('ingestion embeds new and changed Openings once and removes retired vectors', async () => {
  const db = new DatabaseSync(':memory:')
  for (const file of ['0002_app.sql', '0003_vectors.sql', '0004_profile.sql', '0005_scans.sql', '0006_resume_embeddings.sql', '0007_user_opening_fits.sql', '0008_dynamic_opening_results.sql']) {
    db.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'))
  }

  const raw = structuredClone(fixture)
  const vectors = new Map<string, number[]>()
  let embedded = 0
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify(raw))
  const env = {
    APP_DB: makeD1(db),
    BOARD_DB: {
      prepare: () => ({
        all: async () => ({ results: [{ slug: 'openai', company_name: null, feed_url: 'https://feed.test' }] }),
      }),
    },
    AI: {
      run: async (_model: string, input: { text: string[] }) => {
        embedded += input.text.length
        return { data: input.text.map((text) => [text.length]) }
      },
    },
    VECTORIZE: {
      upsert: async (entries: Array<{ id: string; values: number[] }>) => {
        for (const entry of entries) vectors.set(entry.id, entry.values)
      },
      deleteByIds: async (ids: string[]) => {
        for (const id of ids) vectors.delete(id)
      },
    },
  } as never

  try {
    await ingestBoards(env)
    assert.equal(embedded, 2)
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM opening_embeddings').get().count, 2)

    await ingestBoards(env)
    assert.equal(embedded, 2, 'unchanged descriptions reuse their existing vectors')

    raw.jobs[0].descriptionPlain = `${raw.jobs[0].descriptionPlain} Updated.`
    await ingestBoards(env)
    assert.equal(embedded, 3, 'only the changed Opening is re-embedded')

    const removedId = 'openai:1'
    raw.jobs = raw.jobs.slice(1)
    await ingestBoards(env)
    assert.equal(vectors.has(removedId), false, 'retired Openings are removed from Vectorize')
  } finally {
    globalThis.fetch = originalFetch
    db.close()
  }
})
