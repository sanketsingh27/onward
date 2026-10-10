import { ingestBoards } from '../ingest/ingest'
import { hardFilter, type Profile } from '../filter/filter'
import { embedTexts, getOrCreateResumeEmbedding, UPSERT_VECTOR } from '../embed/embed'
import { replaceUserFits } from '../fit/fit'
import { queryVector, upsertVectors } from '../vector/vector'
import { generateReason } from '../rank/rank'
import { fromRow, type OpeningRow } from '../ingest/normalize'

export type ScanReport = { boards: number; survivors: number; ranked: number }

async function loadProfile(env: Env, userId: string): Promise<{ resume: string; profile: Profile }> {
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
export async function runScan(env: Env, userId: string): Promise<ScanReport> {
  const { resume, profile } = await loadProfile(env, userId)

  const outcomes = await ingestBoards(env)

  const { results } = await env.APP_DB.prepare('SELECT * FROM openings').all<OpeningRow>()
  const survivors = hardFilter(results.map((row) => fromRow(row)), profile).survivors

  const resumeVector = await getOrCreateResumeEmbedding(env, userId, resume)
  await env.APP_DB.prepare('DELETE FROM vectors').run()
  const texts = survivors.map((o) => o.descriptionPlain.slice(0, 1200))
  const openingVectors = texts.length > 0 ? await embedTexts(env.AI, texts) : []
  const stmt = env.APP_DB.prepare(UPSERT_VECTOR)
  if (survivors.length > 0) {
    await env.APP_DB.batch(survivors.map((o, i) => stmt.bind(o.id, JSON.stringify(openingVectors[i]))))
    await upsertVectors(env, survivors.map((o, i) => ({ id: o.id, values: openingVectors[i] })))
  }
  const matches = survivors.length > 0
    ? await queryVector(env, resumeVector, Math.min(survivors.length, 100))
    : []
  const survivorIds = new Set(survivors.map((o) => o.id))
  const fits = matches
    .filter((match) => survivorIds.has(match.id))
    .map((match) => ({ openingId: match.id, fit: Math.round(match.score * 100) }))
  await replaceUserFits(env, userId, fits)

  const topN = 10
  const { results: top } = await env.APP_DB.prepare(
    `SELECT o.id, o.title, o.description_plain FROM openings o
     JOIN user_opening_fits f ON f.opening_id = o.id
     WHERE f.user_id = ? ORDER BY f.fit DESC LIMIT ?`,
  ).bind(userId, topN).all<{ id: string; title: string; description_plain: string }>()
  if (top.length > 0) {
    const reasonStmt = env.APP_DB.prepare('UPDATE openings SET reason = ? WHERE id = ?')
    const reasons = await Promise.all(top.map((o) => generateReason(env.AI, resume, o.title, o.description_plain.slice(0, 2000))))
    await env.APP_DB.batch(top.map((o, i) => reasonStmt.bind(reasons[i], o.id)))
  }

  return { boards: outcomes.length, survivors: survivors.length, ranked: top.length }
}
