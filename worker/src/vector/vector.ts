import type { Env } from '../env'
import { getVector } from '../embed/embed'

export async function upsertVectors(env: Env, entries: { id: string; values: number[] }[]): Promise<void> {
  await env.VECTORIZE.upsert(entries)
}

export async function queryVector(env: Env, vector: number[], topK: number): Promise<{ id: string; score: number }[]> {
  const res = await env.VECTORIZE.query(vector, { topK, returnValues: false })
  return res.matches.map((m) => ({ id: m.id, score: m.score }))
}

// Read stored vectors from D1, upsert the openings' vectors, query the resume
// vector, and write fit = round(cosine * 100) back onto each opening.
export async function scoreSurvivors(env: Env): Promise<number> {
  const resume = await getVector(env, 'resume')
  if (!resume) throw new Error('no resume embedding')

  const { results } = await env.APP_DB.prepare(
    "SELECT key, vector FROM vectors WHERE key != 'resume'",
  ).all<{ key: string; vector: string }>()

  const entries = results.map((r) => ({ id: r.key, values: JSON.parse(r.vector) as number[] }))
  await upsertVectors(env, entries)

  const matches = await queryVector(env, resume, entries.length)
  const stmt = env.APP_DB.prepare('UPDATE openings SET fit = ? WHERE id = ?')
  await env.APP_DB.batch(matches.map((m) => stmt.bind(Math.round(m.score * 100), m.id)))

  return matches.length
}
