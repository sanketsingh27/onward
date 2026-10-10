import { getOrCreateResumeEmbedding } from '../embed/embed'
import { replaceUserFits } from '../fit/fit'

export async function upsertVectors(env: Env, entries: { id: string; values: number[] }[]): Promise<void> {
  await env.VECTORIZE.upsert(entries)
}

export async function queryVector(env: Env, vector: number[], topK: number): Promise<{ id: string; score: number }[]> {
  const res = await env.VECTORIZE.query(vector, { topK, returnValues: false })
  return res.matches.map((m) => ({ id: m.id, score: m.score }))
}

// Read shared Opening vectors, score them against this user's Resume, and update Fit.
export async function scoreSurvivors(env: Env, userId: string, resumeText: string): Promise<number> {
  const resume = await getOrCreateResumeEmbedding(env, userId, resumeText)

  const { results } = await env.APP_DB.prepare(
    'SELECT key, vector FROM vectors',
  ).all<{ key: string; vector: string }>()
  if (results.length === 0) {
    await replaceUserFits(env, userId, [])
    return 0
  }

  const entries = results.map((r) => ({ id: r.key, values: JSON.parse(r.vector) as number[] }))
  await upsertVectors(env, entries)

  const matches = await queryVector(env, resume, entries.length)
  const entryIds = new Set(entries.map((entry) => entry.id))
  const fits = matches
    .filter((match) => entryIds.has(match.id))
    .map((match) => ({ openingId: match.id, fit: Math.round(match.score * 100) }))
  await replaceUserFits(env, userId, fits)

  return fits.length
}
