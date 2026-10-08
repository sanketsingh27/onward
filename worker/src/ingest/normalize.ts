// Pure Ashby → Opening normalization. No Cloudflare or runtime deps, so it is
// testable under plain `node --test` against fixtures.

export type Opening = {
  id: string
  board: string
  company: string
  title: string
  location: string
  secondaryLocations: string[]
  remote: 'Remote' | 'Hybrid' | 'Onsite'
  compensation: {
    currency: string
    salaryMin: number
    salaryMax: number
    equityMin?: number
    equityMax?: number
    bonus?: boolean
  }
  employmentType: 'FullTime' | 'Contract'
  publishedAt: string
  applyUrl: string
  descriptionPlain: string
  fit: number
  reason?: string
}

type AshbyComponent = {
  compensationType: string
  currencyCode: string | null
  minValue: number | null
  maxValue: number | null
}

export type AshbyJob = {
  title: string
  location?: string
  secondaryLocations?: { location?: string }[]
  isListed?: boolean
  isRemote?: boolean
  workplaceType?: string
  descriptionPlain?: string
  publishedAt?: string
  employmentType?: string
  jobUrl?: string
  applyUrl?: string
  compensation?: { compensationTiers?: { components?: AshbyComponent[] }[] }
}

export type AshbyBoard = { jobs: AshbyJob[] }

// A stable, short id: the posting's UUID (last path segment of the job URL),
// prefixed by the board slug. Kept short because Vectorize ids cap at 64 bytes.
function idFromUrl(url: string | undefined, board: string, title: string): string {
  if (url) {
    const parts = url.split('/').filter(Boolean)
    const last = parts[parts.length - 1]
    if (last && last !== 'application') return `${board}:${last}`
  }
  return `${board}:${title.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`
}

function extractComp(comp?: AshbyJob['compensation']): Opening['compensation'] {
  const comps = comp?.compensationTiers?.flatMap((t) => t.components ?? []) ?? []
  const salary = comps.find((c) => c.compensationType === 'Salary')
  const equity = comps.find((c) => c.compensationType === 'EquityPercentage')
  const bonus = comps.some((c) => c.compensationType === 'Bonus')
  return {
    currency: salary?.currencyCode ?? 'USD',
    salaryMin: salary?.minValue ?? 0,
    salaryMax: salary?.maxValue ?? 0,
    ...(equity ? { equityMin: equity.minValue ?? undefined, equityMax: equity.maxValue ?? undefined } : {}),
    ...(bonus ? { bonus: true } : {}),
  }
}

function normalizeRemote(raw: AshbyJob): Opening['remote'] {
  if (raw.isRemote) return 'Remote'
  if (raw.workplaceType === 'Hybrid') return 'Hybrid'
  if (raw.workplaceType === 'Onsite') return 'Onsite'
  return 'Onsite'
}

export function normalizeJob(raw: AshbyJob, board: { slug: string; companyName: string | null }): Opening | null {
  if (raw.isListed === false) return null
  return {
    id: idFromUrl(raw.jobUrl, board.slug, raw.title),
    board: board.slug,
    company: board.companyName ?? board.slug,
    title: raw.title,
    location: raw.location ?? '',
    secondaryLocations: (raw.secondaryLocations ?? []).map((s) => s.location ?? '').filter(Boolean),
    remote: normalizeRemote(raw),
    compensation: extractComp(raw.compensation),
    employmentType: raw.employmentType === 'Contract' ? 'Contract' : 'FullTime',
    publishedAt: raw.publishedAt ?? '',
    applyUrl: raw.applyUrl ?? '',
    descriptionPlain: raw.descriptionPlain ?? '',
    fit: 0,
  }
}

export function normalizeBoard(raw: AshbyBoard, board: { slug: string; companyName: string | null }): Opening[] {
  return raw.jobs
    .map((j) => normalizeJob(j, board))
    .filter((o): o is Opening => o !== null)
}

export type OpeningRow = {
  id: string
  board: string
  company: string
  title: string
  location: string
  secondary_locations: string
  remote: string
  currency: string
  salary_min: number
  salary_max: number
  equity_min: number | null
  equity_max: number | null
  bonus: number
  employment_type: string
  published_at: string
  apply_url: string
  description_plain: string
  fit: number
  reason: string | null
}

// D1 rows use snake_case columns; this maps one back to the camelCase Opening.
export function fromRow(r: OpeningRow): Opening {
  return {
    id: r.id,
    board: r.board,
    company: r.company,
    title: r.title,
    location: r.location,
    secondaryLocations: JSON.parse(r.secondary_locations) as string[],
    remote: r.remote as Opening['remote'],
    compensation: {
      currency: r.currency,
      salaryMin: r.salary_min,
      salaryMax: r.salary_max,
      equityMin: r.equity_min ?? undefined,
      equityMax: r.equity_max ?? undefined,
      bonus: r.bonus ? true : undefined,
    },
    employmentType: r.employment_type as Opening['employmentType'],
    publishedAt: r.published_at,
    applyUrl: r.apply_url,
    descriptionPlain: r.description_plain,
    fit: r.fit,
    reason: r.reason ?? undefined,
  }
}
