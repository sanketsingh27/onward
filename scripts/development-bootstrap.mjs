import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, mkdirSync, readFileSync, symlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPlatformProxy, unstable_splitSqlQuery } from '../worker/node_modules/wrangler/wrangler-dist/cli.js'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const defaultRoot = resolve(scriptDirectory, '..')
const appMigrations = [
  '0002_app.sql',
  '0003_vectors.sql',
  '0004_profile.sql',
  '0005_scans.sql',
  '0006_resume_embeddings.sql',
  '0007_user_opening_fits.sql',
  '0008_dynamic_opening_results.sql',
  '0009_profile_user_ids.sql',
]
const boardMigrations = ['0001_boards.sql']
const pendingAppMigrations = ['0010_clerk_user_ids.sql']

function directoryEntryExists(path) {
  try {
    lstatSync(path)
    return true
  } catch {
    return false
  }
}

function parseArguments(args) {
  if (args.length === 0) return { root: defaultRoot }
  if (args.length === 2 && args[0] === '--root') return { root: resolve(args[1]) }
  throw new Error('Usage: node scripts/development-bootstrap.mjs [--root <worktree>]')
}

function primaryWorktree(root) {
  const output = execFileSync('git', ['-C', root, 'worktree', 'list', '--porcelain'], { encoding: 'utf8' })
  const primary = output.match(/^worktree (.+)$/m)?.[1]
  if (!primary) throw new Error('Could not discover the primary Git worktree.')
  return primary
}

function resolveDevelopmentConfiguration(root) {
  const primary = primaryWorktree(root)
  const files = ['app/.env.local', 'worker/.dev.vars.development']
  const missing = []

  for (const relativePath of files) {
    const localPath = join(root, relativePath)
    if (directoryEntryExists(localPath)) continue

    const sharedPath = join(primary, relativePath)
    if (!existsSync(sharedPath)) {
      missing.push(relativePath)
      continue
    }

    mkdirSync(dirname(localPath), { recursive: true })
    symlinkSync(sharedPath, localPath)
  }

  if (missing.length > 0) {
    throw new Error(`Development configuration is missing: ${missing.join(', ')}. Add the missing file in this worktree or the primary Git worktree, then rerun ./dev.sh.`)
  }
}

async function tableExists(database, name) {
  const row = await database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .bind(name)
    .first()
  return row !== null
}

async function representedMigrations(database) {
  const { results } = await database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()
  const tables = new Set(results.map((row) => row.name))
  const columns = async (table) => (await database.prepare(`PRAGMA table_info(${table})`).all()).results
  const profile = await columns('profile')
  const openings = await columns('openings')
  const currentOpenings = tables.has('opening_embeddings') && tables.has('openings') &&
    !openings.some((column) => column.name === 'fit' || column.name === 'reason')
  const textProfile = profile.some((column) => column.name === 'user_id' && column.type === 'TEXT')
  const textOwner = async (table, column) => (await columns(table)).some((item) => item.name === column && item.type === 'TEXT')
  const represented = new Set()
  if (tables.has('boards')) represented.add('0001_boards.sql')
  if (['users', 'openings', 'state'].every((name) => tables.has(name))) represented.add('0002_app.sql')
  if (tables.has('vectors') || currentOpenings) represented.add('0003_vectors.sql')
  if (tables.has('profile')) represented.add('0004_profile.sql')
  if (tables.has('scans') || currentOpenings) represented.add('0005_scans.sql')
  if (tables.has('resume_embeddings')) represented.add('0006_resume_embeddings.sql')
  if (currentOpenings || (tables.has('user_opening_fits') && textProfile)) represented.add('0007_user_opening_fits.sql')
  if (currentOpenings) represented.add('0008_dynamic_opening_results.sql')
  if (textProfile) represented.add('0009_profile_user_ids.sql')
  if (await textOwner('users', 'id') && await textOwner('state', 'user_id')) represented.add('0010_clerk_user_ids.sql')
  return represented
}

function appliedStatement(database, migration) {
  return database.prepare('INSERT OR IGNORE INTO local_schema_migrations (name, applied_at) VALUES (?, ?)')
    .bind(migration, new Date().toISOString())
}

async function executeMigration(database, root, migration) {
  const statements = unstable_splitSqlQuery(readFileSync(join(root, 'migrations', migration), 'utf8'))
    .map((sql) => database.prepare(sql))
  // D1 batch is transactional: schema changes and their ledger entry succeed together.
  await database.batch([...statements, appliedStatement(database, migration)])
}

async function migrationApplied(database, migration) {
  return (await database.prepare('SELECT name FROM local_schema_migrations WHERE name = ?').bind(migration).first()) !== null
}

async function migrateDatabase(database, root, historicalMigrations, pendingMigrations) {
  const hasLedger = await tableExists(database, 'local_schema_migrations')
  const represented = hasLedger ? new Set() : await representedMigrations(database)
  await database.prepare(`CREATE TABLE IF NOT EXISTS local_schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`).run()

  for (const migration of [...historicalMigrations, ...pendingMigrations]) {
    if (await migrationApplied(database, migration)) continue
    if (represented.has(migration)) {
      await appliedStatement(database, migration).run()
    } else {
      await executeMigration(database, root, migration)
    }
  }
}

async function bootstrapSchema(root) {
  resolveDevelopmentConfiguration(root)
  const workerDirectory = join(root, 'worker')
  // Wrangler documents this local proxy and its persistence options at
  // https://developers.cloudflare.com/workers/wrangler/api/#getplatformproxy
  const platform = await getPlatformProxy({
    configPath: join(workerDirectory, 'wrangler.jsonc'),
    environment: 'development',
    persist: { path: join(workerDirectory, '.wrangler', 'state', 'v3') },
    remoteBindings: false,
  })

  try {
    await migrateDatabase(platform.env.BOARD_DB, root, boardMigrations, [])
    await migrateDatabase(platform.env.APP_DB, root, appMigrations, pendingAppMigrations)
    const seed = unstable_splitSqlQuery(readFileSync(join(root, 'seed', 'seed.sql'), 'utf8'))
      .map((sql) => platform.env.BOARD_DB.prepare(sql))
    await platform.env.BOARD_DB.batch(seed)
  } finally {
    await platform.dispose()
  }
}

async function main() {
  const { root } = parseArguments(process.argv.slice(2))
  if (!existsSync(join(root, 'worker', 'wrangler.jsonc'))) {
    throw new Error(`Worker configuration is missing at ${join(root, 'worker', 'wrangler.jsonc')}.`)
  }
  await bootstrapSchema(root)
  console.log('Local development schema is ready.')
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown local schema bootstrap failure.'
  console.error(`Local development setup failed: ${message}`)
  process.exitCode = 1
})
