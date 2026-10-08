import { test } from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { normalizeBoard } from '../worker/src/ingest/normalize.ts'

const raw = JSON.parse(readFileSync(new URL('../fixtures/ashby-sample.json', import.meta.url), 'utf8'))

test('drops unlisted postings', () => {
  const openings = normalizeBoard(raw, { slug: 'openai', companyName: null })
  assert.equal(openings.length, 2)
})

test('maps fields to the Opening shape', () => {
  const openings = normalizeBoard(raw, { slug: 'openai', companyName: null })
  const swe = openings[0]
  assert.equal(swe.title, 'Senior Software Engineer, Applied Engineering')
  assert.equal(swe.remote, 'Remote')
  assert.equal(swe.compensation.currency, 'USD')
  assert.equal(swe.compensation.salaryMin, 290000)
  assert.equal(swe.compensation.salaryMax, 410000)
  assert.equal(swe.employmentType, 'FullTime')
  assert.equal(swe.board, 'openai')
  assert.equal(swe.company, 'openai') // company falls back to the slug
  assert.equal(swe.fit, 0)
})

test('maps a hybrid posting', () => {
  const openings = normalizeBoard(raw, { slug: 'openai', companyName: null })
  assert.equal(openings[1].remote, 'Hybrid')
  assert.equal(openings[1].compensation.salaryMin, 200000)
})
