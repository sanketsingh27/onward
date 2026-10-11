import { embedTexts } from '../embed/embed'
import { upsertVectors } from '../vector/vector'
import { fetchBoard } from './fetch'
import { normalizeBoard, type Opening } from './normalize'

export type BoardOutcome = { board: string; ok: boolean; openings: number; error?: string }

const EMBEDDING_TEXT_LIMIT = 1200
const EMBEDDING_BATCH_SIZE = 100
const UPSERT_OPENING = `INSERT INTO openings
  (id, board, company, title, location, secondary_locations, remote,
   currency, salary_min, salary_max, equity_min, equity_max, bonus,
   employment_type, published_at, apply_url, description_plain)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(id) DO UPDATE SET
    board=excluded.board, company=excluded.company, title=excluded.title,
    location=excluded.location, secondary_locations=excluded.secondary_locations,
    remote=excluded.remote, currency=excluded.currency, salary_min=excluded.salary_min,
    salary_max=excluded.salary_max, equity_min=excluded.equity_min,
    equity_max=excluded.equity_max, bonus=excluded.bonus,
    employment_type=excluded.employment_type, published_at=excluded.published_at,
    apply_url=excluded.apply_url, description_plain=excluded.description_plain`

function rowOf(opening: Opening): unknown[] {
  return [
    opening.id, opening.board, opening.company, opening.title, opening.location,
    JSON.stringify(opening.secondaryLocations), opening.remote,
    opening.compensation.currency, opening.compensation.salaryMin, opening.compensation.salaryMax,
    opening.compensation.equityMin ?? null, opening.compensation.equityMax ?? null, opening.compensation.bonus ? 1 : 0,
    opening.employmentType, opening.publishedAt, opening.applyUrl, opening.descriptionPlain,
  ]
}

async function hashEmbeddingText(opening: Opening): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(opening.descriptionPlain.slice(0, EMBEDDING_TEXT_LIMIT)),
  )
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

// Fetch every tracked Board, update its Openings, and index only descriptions
// that changed. One Board failing is recorded and does not lose other Openings.
export async function ingestBoards(env: Env): Promise<BoardOutcome[]> {
  const { results: boards } = await env.BOARD_DB.prepare(
    'SELECT slug, company_name, feed_url FROM boards',
  ).all<{ slug: string; company_name: string | null; feed_url: string }>()

  return Promise.all(boards.map(async (board): Promise<BoardOutcome> => {
    try {
      const raw = await fetchBoard(board.feed_url)
      const openings = normalizeBoard(raw, { slug: board.slug, companyName: board.company_name })
      const { results: existing } = await env.APP_DB.prepare(
        `SELECT o.id, e.description_hash
         FROM openings o
         LEFT JOIN opening_embeddings e ON e.opening_id = o.id
         WHERE o.board = ?`,
      ).bind(board.slug).all<{ id: string; description_hash: string | null }>()
      const hashes = await Promise.all(openings.map(async (opening) => ({
        opening,
        descriptionHash: await hashEmbeddingText(opening),
      })))
      const existingHashes = new Map(existing.map((row) => [row.id, row.description_hash]))
      const ids = new Set(openings.map((opening) => opening.id))
      const removedIds = existing.filter((row) => !ids.has(row.id)).map((row) => row.id)
      const changed = hashes.filter(({ opening, descriptionHash }) => existingHashes.get(opening.id) !== descriptionHash)

      const upsertOpening = env.APP_DB.prepare(UPSERT_OPENING)
      const deleteOpening = env.APP_DB.prepare('DELETE FROM openings WHERE id = ?')
      const deleteEmbedding = env.APP_DB.prepare('DELETE FROM opening_embeddings WHERE opening_id = ?')
      const writes = [
        ...openings.map((opening) => upsertOpening.bind(...rowOf(opening))),
        ...removedIds.flatMap((id) => [deleteOpening.bind(id), deleteEmbedding.bind(id)]),
      ]
      if (writes.length > 0) await env.APP_DB.batch(writes)

      for (let start = 0; start < changed.length; start += EMBEDDING_BATCH_SIZE) {
        const batch = changed.slice(start, start + EMBEDDING_BATCH_SIZE)
        const vectors = await embedTexts(env.AI, batch.map(({ opening }) => opening.descriptionPlain.slice(0, EMBEDDING_TEXT_LIMIT)))
        await upsertVectors(env, batch.map(({ opening }, index) => ({ id: opening.id, values: vectors[index] })))
        const saveEmbedding = env.APP_DB.prepare(
          `INSERT INTO opening_embeddings (opening_id, description_hash) VALUES (?,?)
           ON CONFLICT(opening_id) DO UPDATE SET description_hash=excluded.description_hash`,
        )
        await env.APP_DB.batch(batch.map(({ opening, descriptionHash }) => saveEmbedding.bind(opening.id, descriptionHash)))
      }
      if (removedIds.length > 0) await env.VECTORIZE.deleteByIds(removedIds)

      return { board: board.slug, ok: true, openings: openings.length }
    } catch (error) {
      return { board: board.slug, ok: false, openings: 0, error: error instanceof Error ? error.message : String(error) }
    }
  }))
}
