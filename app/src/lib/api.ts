import type { Opening, OpeningState } from './openings'

const BASE = process.env.NEXT_PUBLIC_WORKER_URL ?? 'https://onward-worker.singhsanket27.workers.dev'

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

export async function fetchOpenings(token: string): Promise<Opening[]> {
  const res = await fetch(`${BASE}/openings`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(`openings: ${res.status}`)
  return (await res.json()) as Opening[]
}

export type OpeningHistoryPage = {
  data: Array<Opening & { state: 'applied' | 'dismissed' }>
  nextCursor: string | null
}

export async function fetchOpeningHistory(token: string): Promise<OpeningHistoryPage> {
  const res = await fetch(`${BASE}/openings/history`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(`opening history: ${res.status}`)
  return (await res.json()) as OpeningHistoryPage
}

export async function fetchState(token: string): Promise<{ opening_id: string; status: OpeningState }[]> {
  const res = await fetch(`${BASE}/state`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(`state: ${res.status}`)
  const rows = (await res.json()) as { opening_id: string; status: string }[]
  return rows.map((r) => ({ opening_id: r.opening_id, status: r.status as OpeningState }))
}

export async function setOpeningState(token: string, openingId: string, status: Exclude<OpeningState, null>): Promise<void> {
  const res = await fetch(`${BASE}/state`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ opening_id: openingId, status }),
  })
  if (!res.ok) throw new Error(`state: ${res.status}`)
}
