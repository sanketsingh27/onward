import type { Env } from '../env'

export type Status = 'saved' | 'applied' | 'dismissed'

export type StateRow = {
  id: number
  user_id: number
  opening_id: string
  status: Status
  updated_at: string
}

// One row per (user, opening): the latest status wins.
export const UPSERT_STATE = `INSERT INTO state (user_id, opening_id, status, updated_at)
  VALUES (?,?,?,?) ON CONFLICT(user_id, opening_id) DO UPDATE SET status=excluded.status, updated_at=excluded.updated_at`

export const SELECT_STATE = `SELECT * FROM state WHERE user_id = ?`

const VALID_STATUS: Status[] = ['saved', 'applied', 'dismissed']

export function isValidStatus(s: string): s is Status {
  return VALID_STATUS.includes(s as Status)
}

export async function upsertState(env: Env, user_id: number, opening_id: string, status: Status): Promise<void> {
  await env.APP_DB.prepare(UPSERT_STATE).bind(user_id, opening_id, status, new Date().toISOString()).run()
}

export async function listState(env: Env, user_id: number): Promise<StateRow[]> {
  const { results } = await env.APP_DB.prepare(SELECT_STATE).bind(user_id).all<StateRow>()
  return results
}
