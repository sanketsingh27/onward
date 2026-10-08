import type { Env } from '../env'
import { fetchBoard } from './fetch'
import { normalizeBoard, type Opening } from './normalize'

export type BoardOutcome = { board: string; ok: boolean; openings: number; error?: string }

const UPSERT = `INSERT OR REPLACE INTO openings
  (id, board, company, title, location, secondary_locations, remote,
   currency, salary_min, salary_max, equity_min, equity_max, bonus,
   employment_type, published_at, apply_url, description_plain, fit, reason)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`

function rowOf(o: Opening): unknown[] {
  return [
    o.id, o.board, o.company, o.title, o.location,
    JSON.stringify(o.secondaryLocations), o.remote,
    o.compensation.currency, o.compensation.salaryMin, o.compensation.salaryMax,
    o.compensation.equityMin ?? null, o.compensation.equityMax ?? null, o.compensation.bonus ? 1 : 0,
    o.employmentType, o.publishedAt, o.applyUrl, o.descriptionPlain,
    o.fit, o.reason ?? null,
  ]
}

// Fetch every tracked board, normalize, and upsert into D1. One board failing
// is recorded and does not lose the others' openings.
export async function ingestBoards(env: Env): Promise<BoardOutcome[]> {
  const { results: boards } = await env.BOARD_DB.prepare(
    'SELECT slug, company_name, feed_url FROM boards',
  ).all<{ slug: string; company_name: string | null; feed_url: string }>()

  const outcomes = await Promise.all(
    boards.map(async (b): Promise<BoardOutcome> => {
      try {
        const raw = await fetchBoard(b.feed_url)
        const openings = normalizeBoard(raw, { slug: b.slug, companyName: b.company_name })
        await env.APP_DB.prepare('DELETE FROM openings WHERE board = ?').bind(b.slug).run()
        const stmt = env.APP_DB.prepare(UPSERT)
        await env.APP_DB.batch(openings.map((o) => stmt.bind(...rowOf(o))))
        return { board: b.slug, ok: true, openings: openings.length }
      } catch (e) {
        return { board: b.slug, ok: false, openings: 0, error: e instanceof Error ? e.message : String(e) }
      }
    }),
  )

  return outcomes
}
