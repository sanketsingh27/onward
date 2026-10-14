import { getOrCreateResumeEmbedding } from '../worker/src/embed/embed.ts'
import { hardFilter, type Profile } from '../worker/src/filter/filter.ts'
import { fromRow, type OpeningRow } from '../worker/src/ingest/normalize.ts'
import { queryVector } from '../worker/src/vector/vector.ts'

const RECALL_LIMIT = 100
const OPENINGS_PER_QUERY = 100
const STATE_MARKER = 'initial-demo-state'

type StateStatus = 'saved' | 'applied' | 'dismissed'

type DevelopmentStateEnvironment = {
  APP_DB: Pick<D1Database, 'prepare' | 'batch'>
  AI: Pick<Ai, 'run'>
  VECTORIZE: Pick<Env['VECTORIZE'], 'query'>
}

type StateBootstrapOptions = {
  env: DevelopmentStateEnvironment
  userId: string
}

type ExistingState = {
  opening_id: string
  status: StateStatus
}

type StateBootstrapResult =
  | { complete: true }
  | { complete: false; reason: string }

async function recalledOpenings(env: DevelopmentStateEnvironment, userId: string, resume: string, filters: Profile) {
  const vector = await getOrCreateResumeEmbedding(env, userId, resume)
  const matches = await queryVector(env, vector, RECALL_LIMIT)
  if (matches.length === 0) return []

  const ids = [...new Set(matches.map((match) => match.id))]
  const rows: OpeningRow[] = []
  for (let start = 0; start < ids.length; start += OPENINGS_PER_QUERY) {
    const batch = ids.slice(start, start + OPENINGS_PER_QUERY)
    const placeholders = batch.map(() => '?').join(',')
    const result = await env.APP_DB.prepare(`SELECT id, board, company, title, location, secondary_locations, remote,
      currency, salary_min, salary_max, equity_min, equity_max, bonus, employment_type,
      published_at, apply_url, description_plain FROM openings WHERE id IN (${placeholders})`)
      .bind(...batch).all<OpeningRow>()
    rows.push(...result.results)
  }

  const survivors = new Set(hardFilter(rows.map((row) => fromRow(row)), filters).survivors.map((opening) => opening.id))
  return ids.filter((id) => survivors.has(id))
}

function existingOrCandidate(status: StateStatus, openingIds: string[], existing: Map<string, StateStatus>, selected: Set<string>) {
  return openingIds.find((id) => existing.get(id) === status && !selected.has(id))
    ?? openingIds.find((id) => !existing.has(id) && !selected.has(id))
}

export async function bootstrapDevelopmentState({ env, userId }: StateBootstrapOptions): Promise<StateBootstrapResult> {
  const marker = await env.APP_DB.prepare('SELECT user_id FROM development_bootstrap_state WHERE name = ?')
    .bind(STATE_MARKER).first<{ user_id: string }>()
  if (marker?.user_id === userId) return { complete: true }
  if (marker) throw new Error('State bootstrap owner stage failed: the initial-State marker belongs to a different Profile owner.')

  const profile = await env.APP_DB.prepare('SELECT resume, filters FROM profile WHERE user_id = ?')
    .bind(userId).first<{ resume: string; filters: string }>()
  if (!profile) throw new Error('State bootstrap Profile stage failed: the resolved Profile is missing.')

  let filters: Profile
  try {
    filters = JSON.parse(profile.filters) as Profile
  } catch {
    throw new Error('State bootstrap Profile stage failed: the saved filters are invalid.')
  }

  const [{ results: allOpenings }, { results: existingRows }] = await Promise.all([
    env.APP_DB.prepare('SELECT id FROM openings ORDER BY id').all<{ id: string }>(),
    env.APP_DB.prepare('SELECT opening_id, status FROM state WHERE user_id = ?').bind(userId).all<ExistingState>(),
  ])
  const existing = new Map(existingRows.map((row) => [row.opening_id, row.status]))
  const survivors = await recalledOpenings(env, userId, profile.resume, filters)
  if (survivors.length === 0) {
    return { complete: false, reason: 'the saved Profile has no actual Recall Survivors, so demo State was not inserted' }
  }

  const selected = new Set<string>()
  const saved = existingOrCandidate('saved', survivors, existing, selected)
  if (!saved) return { complete: false, reason: 'no unmodified actual Recall Survivor is available for the saved demo State' }
  selected.add(saved)

  const survivorIds = new Set(survivors)
  const historyCandidates = [
    ...allOpenings.map((opening) => opening.id).filter((id) => !survivorIds.has(id)),
    ...survivors,
  ]
  const applied = existingOrCandidate('applied', historyCandidates, existing, selected)
  if (!applied) return { complete: false, reason: 'no unmodified imported Opening is available for the applied demo State' }
  selected.add(applied)
  const dismissed = existingOrCandidate('dismissed', historyCandidates, existing, selected)
  if (!dismissed) return { complete: false, reason: 'no second unmodified imported Opening is available for the dismissed demo State' }

  const actedOn = new Set(existingRows.filter((row) => row.status === 'applied' || row.status === 'dismissed').map((row) => row.opening_id))
  actedOn.add(applied)
  actedOn.add(dismissed)
  if (!survivors.some((id) => id !== saved && !existing.has(id) && !actedOn.has(id))) {
    return { complete: false, reason: 'demo State needs a saved example plus at least one unacted actual Recall Survivor' }
  }

  const now = new Date().toISOString()
  const complete = env.APP_DB.prepare(
    'INSERT INTO development_bootstrap_state (name, user_id, completed_at) VALUES (?,?,?)',
  ).bind(STATE_MARKER, userId, now)
  const examples: Array<[string, StateStatus]> = [[saved, 'saved'], [applied, 'applied'], [dismissed, 'dismissed']]
  await env.APP_DB.batch([
    ...examples.filter(([id]) => !existing.has(id)).map(([id, status]) => env.APP_DB.prepare(
      'INSERT INTO state (user_id, opening_id, status, updated_at) VALUES (?,?,?,?)',
    ).bind(userId, id, status, now)),
    complete,
  ])
  return { complete: true }
}
