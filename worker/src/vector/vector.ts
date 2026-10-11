export async function upsertVectors(env: Env, entries: { id: string; values: number[] }[]): Promise<void> {
  await env.VECTORIZE.upsert(entries)
}

export async function queryVector(env: Env, vector: number[], topK: number): Promise<{ id: string; score: number }[]> {
  const res = await env.VECTORIZE.query(vector, { topK, returnValues: false })
  return res.matches.map((match) => ({ id: match.id, score: match.score }))
}
