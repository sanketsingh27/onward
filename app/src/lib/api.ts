import type { Opening, OpeningState } from './openings'

const BASE = 'https://onward-worker.singhsanket27.workers.dev'

export async function fetchOpenings(): Promise<Opening[]> {
  const res = await fetch(`${BASE}/openings`)
  if (!res.ok) throw new Error(`openings: ${res.status}`)
  return (await res.json()) as Opening[]
}

export async function fetchState(): Promise<{ opening_id: string; status: OpeningState }[]> {
  const res = await fetch(`${BASE}/state?user=1`)
  if (!res.ok) throw new Error(`state: ${res.status}`)
  const rows = (await res.json()) as { opening_id: string; status: string }[]
  return rows.map((r) => ({ opening_id: r.opening_id, status: r.status as OpeningState }))
}

export async function setOpeningState(openingId: string, status: Exclude<OpeningState, null>): Promise<void> {
  const res = await fetch(`${BASE}/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: 1, opening_id: openingId, status }),
  })
  if (!res.ok) throw new Error(`state: ${res.status}`)
}

export async function startScan(): Promise<{ jobId: string }> {
  const res = await fetch(`${BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!res.ok) throw new Error(`scan: ${res.status}`)
  return (await res.json()) as { jobId: string }
}

export async function pollScan(jobId: string): Promise<{ status: string }> {
  const res = await fetch(`${BASE}/scan/${jobId}`)
  if (!res.ok) throw new Error(`scan status: ${res.status}`)
  return (await res.json()) as { status: string }
}
