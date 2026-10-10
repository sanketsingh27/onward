export type UserFit = { openingId: string; fit: number }

export const DELETE_USER_FITS = 'DELETE FROM user_opening_fits WHERE user_id = ?'
export const UPSERT_USER_FIT = `INSERT INTO user_opening_fits (user_id, opening_id, fit)
  VALUES (?,?,?) ON CONFLICT(user_id, opening_id) DO UPDATE SET fit=excluded.fit`

export const OPENINGS_FOR_USER = `SELECT o.id, o.board, o.company, o.title, o.location,
  o.secondary_locations, o.remote, o.currency, o.salary_min, o.salary_max,
  o.equity_min, o.equity_max, o.bonus, o.employment_type, o.published_at,
  o.apply_url, o.description_plain, o.reason, f.fit FROM openings o
  JOIN user_opening_fits f ON f.opening_id = o.id
  WHERE f.user_id = ? AND f.fit > 0
  ORDER BY f.fit DESC`

export const RANKED_OPENINGS_FOR_USER = `SELECT o.id, o.board, o.company, o.title, o.location,
  o.secondary_locations, o.remote, o.currency, o.salary_min, o.salary_max,
  o.equity_min, o.equity_max, o.bonus, o.employment_type, o.published_at,
  o.apply_url, o.description_plain, o.reason, f.fit FROM openings o
  JOIN user_opening_fits f ON f.opening_id = o.id
  WHERE f.user_id = ? AND f.fit > 0
    AND NOT EXISTS (
      SELECT 1 FROM state s
      WHERE s.user_id = ? AND s.opening_id = o.id AND s.status IN ('applied','dismissed')
    )
  ORDER BY f.fit DESC`

export async function replaceUserFits(env: Env, userId: string, fits: UserFit[]): Promise<void> {
  const upsert = env.APP_DB.prepare(UPSERT_USER_FIT)
  await env.APP_DB.batch([
    env.APP_DB.prepare(DELETE_USER_FITS).bind(userId),
    ...fits.map((entry) => upsert.bind(userId, entry.openingId, entry.fit)),
  ])
}
