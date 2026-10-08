import type { Opening } from '../ingest/normalize'

export type Profile = {
  remote: 'Remote only' | 'Hybrid ok' | 'Onsite ok'
  locations: string[]
  compFloorUsd: number
  compFloorInr: number
  employmentType: 'Full-time' | 'Contract'
  seniority: 'Mid' | 'Senior' | 'Senior+' | 'Staff+'
  excludeTerms: string[]
}

export type Flagged = { opening: Opening; terms: string[] }

export type FilterResult = { survivors: Opening[]; flagged: Flagged[] }

const SENIORITY_KEYWORDS: Record<Profile['seniority'], string[]> = {
  Mid: ['engineer', 'developer'],
  Senior: ['senior'],
  'Senior+': ['senior', 'staff', 'lead', 'principal'],
  'Staff+': ['staff', 'principal', 'lead', 'architect', 'director'],
}

function remoteOk(pref: Profile['remote'], remote: Opening['remote']): boolean {
  if (pref === 'Onsite ok') return true
  if (pref === 'Hybrid ok') return remote !== 'Onsite'
  return remote === 'Remote'
}

function locationOk(pref: string[], opening: Opening): boolean {
  if (pref.length === 0) return true
  const hay = [opening.location, ...opening.secondaryLocations].join(' ').toLowerCase()
  return pref.some((p) => hay.includes(p.toLowerCase()))
}

function compOk(pref: { usd: number; inr: number }, opening: Opening): boolean {
  const { currency, salaryMax } = opening.compensation
  if (salaryMax === 0) return true // no published compensation — don't filter
  if (currency === 'INR') return salaryMax >= pref.inr
  if (currency === 'USD') return salaryMax >= pref.usd
  return true // unhandled currency — don't filter
}

function seniorityOk(pref: Profile['seniority'], title: string): boolean {
  const t = title.toLowerCase()
  return SENIORITY_KEYWORDS[pref].some((k) => t.includes(k))
}

function employmentOk(pref: Profile['employmentType'], e: Opening['employmentType']): boolean {
  if (pref === 'Contract') return e === 'Contract'
  return e === 'FullTime'
}

// Hard filters drop; exclude terms flag (the opening stays, badged).
export function hardFilter(openings: Opening[], profile: Profile): FilterResult {
  const survivors: Opening[] = []
  const flagged: Flagged[] = []

  for (const o of openings) {
    const terms = profile.excludeTerms.filter((t) =>
      `${o.title} ${o.descriptionPlain}`.toLowerCase().includes(t.toLowerCase()),
    )
    if (terms.length > 0) flagged.push({ opening: o, terms })

    if (!remoteOk(profile.remote, o.remote)) continue
    if (!locationOk(profile.locations, o)) continue
    if (!compOk({ usd: profile.compFloorUsd, inr: profile.compFloorInr }, o)) continue
    if (!seniorityOk(profile.seniority, o.title)) continue
    if (!employmentOk(profile.employmentType, o.employmentType)) continue

    survivors.push(o)
  }

  return { survivors, flagged }
}
