import { test } from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { normalizeBoard, type Opening } from '../worker/src/ingest/normalize.ts'
import { hardFilter, type Profile } from '../worker/src/filter/filter.ts'

const raw = JSON.parse(readFileSync(new URL('../fixtures/ashby-sample.json', import.meta.url), 'utf8'))

const profile: Profile = {
  remote: 'Remote only',
  locations: ['San Francisco', 'New York'],
  compFloorUsd: 180000,
  compFloorInr: 2500000,
  employmentType: 'Full-time',
  seniority: 'Senior+',
  excludeTerms: ['security clearance', 'visa sponsorship'],
}

test('keeps only openings that pass every hard filter', () => {
  const openings = normalizeBoard(raw, { slug: 'openai', companyName: null })
  const { survivors } = hardFilter(openings, profile)
  assert.equal(survivors.length, 1)
  assert.equal(survivors[0].title, 'Senior Software Engineer, Applied Engineering')
})

test('drops a hybrid posting under a Remote-only profile', () => {
  const openings = normalizeBoard(raw, { slug: 'openai', companyName: null })
  const { survivors } = hardFilter(openings, { ...profile, remote: 'Remote only' })
  assert.equal(survivors.every((o) => o.remote === 'Remote'), true)
})

test('drops below the comp floor', () => {
  const low: Opening = {
    id: 'x', board: 'b', company: 'c', title: 'Senior Software Engineer',
    location: 'San Francisco, CA', secondaryLocations: [], remote: 'Remote',
    compensation: { currency: 'USD', salaryMin: 90000, salaryMax: 120000 },
    employmentType: 'FullTime', publishedAt: '', applyUrl: '', descriptionPlain: '', fit: 0,
  }
  assert.equal(hardFilter([low], profile).survivors.length, 0)
})

test('flags, but keeps, an opening with an excluded term', () => {
  const cleared: Opening = {
    id: 'x', board: 'b', company: 'c', title: 'Staff Software Engineer',
    location: 'San Francisco, CA', secondaryLocations: [], remote: 'Remote',
    compensation: { currency: 'USD', salaryMin: 210000, salaryMax: 260000 },
    employmentType: 'FullTime', publishedAt: '', applyUrl: '',
    descriptionPlain: 'Requires an active security clearance.', fit: 0,
  }
  const { survivors, flagged } = hardFilter([cleared], profile)
  assert.equal(survivors.length, 1)
  assert.equal(flagged.length, 1)
  assert.deepEqual(flagged[0].terms, ['security clearance'])
})

test('drops a non-senior title under a Senior+ profile', () => {
  const jr: Opening = {
    id: 'x', board: 'b', company: 'c', title: 'Associate Engineer',
    location: 'San Francisco, CA', secondaryLocations: [], remote: 'Remote',
    compensation: { currency: 'USD', salaryMin: 190000, salaryMax: 220000 },
    employmentType: 'FullTime', publishedAt: '', applyUrl: '', descriptionPlain: '', fit: 0,
  }
  assert.equal(hardFilter([jr], profile).survivors.length, 0)
})
