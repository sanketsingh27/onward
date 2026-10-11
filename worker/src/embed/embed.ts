
const EMBED_MODEL = '@cf/baai/bge-base-en-v1.5'

export async function embedTexts(ai: Ai, texts: string[]): Promise<number[][]> {
  const res = await ai.run(EMBED_MODEL, { text: texts })
  // Workers AI embedding models return { data: number[][] }.
  const output = res as { data: number[][] }
  return output.data
}


export async function getOrCreateResumeEmbedding(env: Env, userId: string, resume: string): Promise<number[]> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(resume))
  const resumeHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  const row = await env.APP_DB.prepare(
    'SELECT resume_hash, vector FROM resume_embeddings WHERE user_id = ?',
  ).bind(userId).first<{ resume_hash: string; vector: string }>()
  if (row?.resume_hash === resumeHash) return JSON.parse(row.vector) as number[]

  const [vector] = await embedTexts(env.AI, [resume])
  await env.APP_DB.prepare(
    `INSERT INTO resume_embeddings (user_id, resume_hash, vector) VALUES (?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET resume_hash=excluded.resume_hash, vector=excluded.vector`,
  ).bind(userId, resumeHash, JSON.stringify(vector)).run()
  return vector
}
