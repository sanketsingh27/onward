
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
