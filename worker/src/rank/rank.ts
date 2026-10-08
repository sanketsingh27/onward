import type { Env } from '../env'

const LLM_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8'

export async function generateReason(ai: Ai, resume: string, title: string, description: string): Promise<string> {
  const messages = [
    { role: 'system', content: 'You write one-sentence, plain-spoken reasons a candidate matches a job. Be specific, no marketing words.' },
    { role: 'user', content: `Resume:\n${resume}\n\nJob: ${title}\n${description}\n\nOne sentence on how well this candidate matches:` },
  ]
  const res = await ai.run(LLM_MODEL, { messages, max_tokens: 80 })
  // Workers AI text-generation models return { response: string }.
  const out = res as { response: string }
  return out.response.trim()
}

// Order openings by fit descending and write a one-line reason for the top-N.
export async function rankOpenings(env: Env, resume: string, topN: number): Promise<number> {
  const { results } = await env.APP_DB.prepare(
    'SELECT id, title, description_plain FROM openings ORDER BY fit DESC LIMIT ?',
  ).bind(topN).all<{ id: string; title: string; description_plain: string }>()

  const stmt = env.APP_DB.prepare('UPDATE openings SET reason = ? WHERE id = ?')
  for (const o of results) {
    const reason = await generateReason(env.AI, resume, o.title, o.description_plain)
    await stmt.bind(reason, o.id).run()
  }
  return results.length
}
