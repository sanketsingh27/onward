import type { AshbyBoard } from './normalize'

export async function fetchBoard(feedUrl: string): Promise<AshbyBoard> {
  const res = await fetch(feedUrl)
  if (!res.ok) throw new Error(`Ashby returned ${res.status} for ${feedUrl}`)
  return (await res.json()) as AshbyBoard
}
