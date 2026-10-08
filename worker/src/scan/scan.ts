import type { Env } from '../env'
import { ingestBoards } from '../ingest/ingest'
import { hardFilter, type Profile } from '../filter/filter'
import { embedTexts, storeVector, UPSERT_VECTOR } from '../embed/embed'
import { queryVector, upsertVectors } from '../vector/vector'
import { generateReason } from '../rank/rank'
import { fromRow, type OpeningRow } from '../ingest/normalize'

export type ScanReport = { boards: number; survivors: number; ranked: number }

async function loadProfile(env: Env, userId: number): Promise<{ resume: string; profile: Profile }> {
  const row = await env.APP_DB.prepare('SELECT resume, filters FROM profile WHERE user_id = ?')
    .bind(userId)
    .first<{ resume: string; filters: string }>()
  if (!row) throw new Error(`no profile for user ${userId}`)
  return { resume: row.resume, profile: JSON.parse(row.filters) as Profile }
}

export async function markScan(env: Env, id: string, status: string, detail = ''): Promise<void> {
  await env.APP_DB.prepare(
    'INSERT INTO scans (id, status, detail, updated_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status, detail=excluded.detail, updated_at=excluded.updated_at',
  ).bind(id, status, detail, new Date().toISOString()).run()
}

// The full pipeline: ingest → hard filter → embed → score → rank.
export async function runScan(env: Env, userId: number): Promise<ScanReport> {
  const { resume, profile } = await loadProfile(env, userId)

  const outcomes = await ingestBoards(env)

  const { results } = await env.APP_DB.prepare('SELECT * FROM openings').all<OpeningRow>()
  const survivors = hardFilter(results.map(fromRow), profile).survivors

  await env.APP_DB.prepare('DELETE FROM vectors').run()
  const texts = [resume, ...survivors.map((o) => o.descriptionPlain.slice(0, 1200))]
  const vectors = await embedTexts(env.AI, texts)
  await storeVector(env, 'resume', vectors[0])
  const stmt = env.APP_DB.prepare(UPSERT_VECTOR)
  await env.APP_DB.batch(survivors.map((o, i) => stmt.bind(o.id, JSON.stringify(vectors[i + 1]))))

  await upsertVectors(env, survivors.map((o, i) => ({ id: o.id, values: vectors[i + 1] })))
  const matches = await queryVector(env, vectors[0], Math.min(survivors.length, 100))
  const fitStmt = env.APP_DB.prepare('UPDATE openings SET fit = ? WHERE id = ?')
  await env.APP_DB.batch(matches.map((m) => fitStmt.bind(Math.round(m.score * 100), m.id)))

  const topN = 10
  const { results: top } = await env.APP_DB.prepare(
    'SELECT id, title, description_plain FROM openings ORDER BY fit DESC LIMIT ?',
  ).bind(topN).all<{ id: string; title: string; description_plain: string }>()
  const reasonStmt = env.APP_DB.prepare('UPDATE openings SET reason = ? WHERE id = ?')
  const reasons = await Promise.all(top.map((o) => generateReason(env.AI, resume, o.title, o.description_plain.slice(0, 2000))))
  await env.APP_DB.batch(top.map((o, i) => reasonStmt.bind(reasons[i], o.id)))

  return { boards: outcomes.length, survivors: survivors.length, ranked: top.length }
}
