import type { Env } from '../env'

const EMBED_MODEL = '@cf/baai/bge-base-en-v1.5'

export async function embedTexts(ai: Ai, texts: string[]): Promise<number[][]> {
  const res = await ai.run(EMBED_MODEL, { text: texts })
  // Workers AI embedding models return { data: number[][] }.
  const output = res as { data: number[][] }
  return output.data
}

export const UPSERT_VECTOR = `INSERT INTO vectors (key, vector) VALUES (?,?)
  ON CONFLICT(key) DO UPDATE SET vector=excluded.vector`
export const SELECT_VECTOR = `SELECT vector FROM vectors WHERE key = ?`

export async function storeVector(env: Env, key: string, vector: number[]): Promise<void> {
  await env.APP_DB.prepare(UPSERT_VECTOR).bind(key, JSON.stringify(vector)).run()
}

export async function getVector(env: Env, key: string): Promise<number[] | null> {
  const row = await env.APP_DB.prepare(SELECT_VECTOR).bind(key).first<{ vector: string }>()
  return row ? (JSON.parse(row.vector) as number[]) : null
}

// Embed the resume and every survivor's description in one batched call, then
// store each vector keyed by its opening id (the resume under 'resume').
export async function embedSurvivors(env: Env, resumeText: string): Promise<{ resume: boolean; openings: number }> {
  const { results: openings } = await env.APP_DB.prepare(
    'SELECT id, description_plain FROM openings',
  ).all<{ id: string; description_plain: string }>()

  const texts = [resumeText, ...openings.map((o) => o.description_plain)]
  const vectors = await embedTexts(env.AI, texts)

  const stmt = env.APP_DB.prepare(UPSERT_VECTOR)
  await env.APP_DB.batch([
    stmt.bind('resume', JSON.stringify(vectors[0])),
    ...openings.map((o, i) => stmt.bind(o.id, JSON.stringify(vectors[i + 1]))),
  ])

  return { resume: true, openings: openings.length }
}
