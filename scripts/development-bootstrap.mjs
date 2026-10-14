import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, symlinkSync, writeFileSync } from 'node:fs'
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
const pendingAppMigrations = ['0010_clerk_user_ids.sql', '0011_development_bootstrap_state.sql']

function directoryEntryExists(path) {
  try {
    lstatSync(path)
    return true
  } catch {
    return false
  }
}

function parseArguments(args) {
  let root = defaultRoot
  let stage = 'full'
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--root' && args[index + 1]) {
      root = resolve(args[++index])
    } else if (args[index] === '--schema') {
      stage = 'schema'
    } else if (args[index] === '--profile') {
      stage = 'profile'
    } else {
      throw new Error('Usage: node scripts/development-bootstrap.mjs [--schema|--profile] [--root <worktree>]')
    }
  }
  return { root, stage }
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

function privateResumePath(root) {
  const local = join(root, 'seed', '.local', 'resume.md')
  return existsSync(local) ? local : join(primaryWorktree(root), 'seed', '.local', 'resume.md')
}

function environmentValue(path, name) {
  if (!existsSync(path)) return undefined
  const line = readFileSync(path, 'utf8').split(/\r?\n/).find((value) => value.startsWith(`${name}=`))
  if (!line) return undefined
  const value = line.slice(name.length + 1).trim()
  return value.replace(/^(['"])(.*)\1$/, '$2') || undefined
}

async function bootstrapProfile(root) {
  const resumePath = privateResumePath(root)
  if (!existsSync(resumePath)) {
    throw new Error('Profile bootstrap input stage failed: seed/.local/resume.md is missing in this or the primary worktree.')
  }
  const resume = readFileSync(resumePath, 'utf8')
  const workerDirectory = join(root, 'worker')
  const localPlatform = await getPlatformProxy({
    configPath: join(workerDirectory, 'wrangler.jsonc'), environment: 'development',
    persist: { path: join(workerDirectory, '.wrangler', 'state', 'v3') }, remoteBindings: false,
  })
  try {
    const { bootstrapDevelopmentProfile, resolveDevelopmentClerkAccount } = await import('./development-profile-bootstrap.ts')
    const secretKey = environmentValue(join(root, 'app', '.env.local'), 'CLERK_SECRET_KEY')
    let remotePlatform
    try {
      const lazyAI = { async run(...args) {
        remotePlatform ??= await getPlatformProxy({
          configPath: join(workerDirectory, 'wrangler.jsonc'), environment: 'development',
          persist: { path: join(workerDirectory, '.wrangler', 'state', 'v3') }, remoteBindings: true,
        })
        return remotePlatform.env.AI.run(...args)
      } }
      return await bootstrapDevelopmentProfile({
        env: { APP_DB: localPlatform.env.APP_DB, AI: lazyAI }, resume,
        resolveAccount: (email) => resolveDevelopmentClerkAccount(secretKey, email),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown remote embedding failure'
      throw new Error(`Profile bootstrap embedding stage failed: ${message}`)
    } finally {
      await remotePlatform?.dispose()
    }
  } finally {
    await localPlatform.dispose()
  }
}

async function bootstrapState(root, userId) {
  const workerDirectory = join(root, 'worker')
  const localPlatform = await getPlatformProxy({
    configPath: join(workerDirectory, 'wrangler.jsonc'), environment: 'development',
    persist: { path: join(workerDirectory, '.wrangler', 'state', 'v3') }, remoteBindings: false,
  })
  try {
    const { bootstrapDevelopmentState } = await import('./development-state-bootstrap.ts')
    let remotePlatform
    try {
      const remote = async () => {
        remotePlatform ??= await getPlatformProxy({
          configPath: join(workerDirectory, 'wrangler.jsonc'), environment: 'development',
          persist: { path: join(workerDirectory, '.wrangler', 'state', 'v3') }, remoteBindings: true,
        })
        return remotePlatform.env
      }
      return await bootstrapDevelopmentState({
        env: {
          APP_DB: localPlatform.env.APP_DB,
          AI: { run: async (...args) => (await remote()).AI.run(...args) },
          VECTORIZE: { query: async (...args) => (await remote()).VECTORIZE.query(...args) },
        },
        userId,
      })
    } finally {
      await remotePlatform?.dispose()
    }
  } finally {
    await localPlatform.dispose()
  }
}

function readOpeningCache(root) {
  const path = join(root, 'seed', '.local', 'openings.json')
  if (!existsSync(path)) return new Map()
  let parsed
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    throw new Error('Opening bootstrap input stage failed: seed/.local/openings.json is malformed.')
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.boards || typeof parsed.boards !== 'object' || Array.isArray(parsed.boards)) {
    throw new Error('Opening bootstrap input stage failed: seed/.local/openings.json has no Board sources.')
  }
  const entries = Object.entries(parsed.boards)
  if (entries.length === 0 || entries.some(([, source]) => !source || typeof source !== 'object' || !Array.isArray(source.jobs))) {
    throw new Error('Opening bootstrap input stage failed: seed/.local/openings.json contains an empty or invalid Board source.')
  }
  return new Map(entries)
}

function writeOpeningCache(root, sources) {
  const path = join(root, 'seed', '.local', 'openings.json')
  mkdirSync(dirname(path), { recursive: true })
  const temporaryPath = `${path}.${process.pid}.tmp`
  writeFileSync(temporaryPath, `${JSON.stringify({ version: 1, boards: Object.fromEntries(sources) }, null, 2)}\n`, { mode: 0o600 })
  renameSync(temporaryPath, path)
}

function indexedOpeningIds(workerDirectory) {
  // The binding returns full vectors and caps getByIds at 20. The read-only
  // inventory API pages IDs only, avoiding thousands of floats on warm startup.
  const ids = new Set()
  let cursor
  do {
    const args = ['vectorize', 'list-vectors', 'openings-dev', '--env', 'development', '--count', '1000', '--json']
    if (cursor) args.push(`--cursor=${cursor}`)
    const output = execFileSync(join(workerDirectory, 'node_modules', '.bin', 'wrangler'), args, {
      cwd: workerDirectory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    })
    const page = JSON.parse(output)
    if (!Array.isArray(page.vectors)) throw new Error('Opening bootstrap index stage failed: invalid Vectorize ID inventory.')
    for (const vector of page.vectors) ids.add(vector.id)
    cursor = page.isTruncated ? page.nextCursor : undefined
    if (page.isTruncated && !cursor) throw new Error('Opening bootstrap index stage failed: truncated inventory has no continuation cursor.')
  } while (cursor)
  return ids
}


async function bootstrapOpenings(root) {
  const workerDirectory = join(root, 'worker')
  const localPlatform = await getPlatformProxy({
    configPath: join(workerDirectory, 'wrangler.jsonc'), environment: 'development',
    persist: { path: join(workerDirectory, '.wrangler', 'state', 'v3') }, remoteBindings: false,
  })
  try {
    const { fetchBoard } = await import('../worker/src/ingest/fetch.ts')
    const { ingestBoards } = await import('../worker/src/ingest/ingest.ts')
    const sources = readOpeningCache(root)
    const { results: boards } = await localPlatform.env.BOARD_DB.prepare(
      'SELECT slug, feed_url FROM boards',
    ).all()
    const sourceErrors = []
    for (const board of boards) {
      if (sources.has(board.slug)) continue
      try {
        const source = await fetchBoard(board.feed_url)
        if (!source || typeof source !== 'object' || !Array.isArray(source.jobs)) throw new Error('Ashby returned an invalid Opening source')
        sources.set(board.slug, source)
        writeOpeningCache(root, sources)
      } catch (error) {
        sourceErrors.push({ board: board.slug, ok: false, openings: 0, error: error instanceof Error ? error.message : String(error) })
      }
    }
    if (sources.size === 0) {
      throw new Error(`Opening bootstrap source stage failed: ${sourceErrors.map((outcome) => `${outcome.board}: ${outcome.error}`).join('; ') || 'no registered Board sources were available'}.`)
    }

    const hasCachedEmbeddings = await localPlatform.env.APP_DB.prepare('SELECT opening_id FROM opening_embeddings LIMIT 1').first()
    const indexedIds = hasCachedEmbeddings ? indexedOpeningIds(workerDirectory) : undefined

    let remotePlatform
    let remotePromise
    const remote = () => {
      // Board ingestion is concurrent; share one in-flight remote connection.
      remotePromise ??= getPlatformProxy({
        configPath: join(workerDirectory, 'wrangler.jsonc'), environment: 'development',
        persist: { path: join(workerDirectory, '.wrangler', 'state', 'v3') }, remoteBindings: true,
      }).then((platform) => {
        remotePlatform = platform
        return platform.env
      })
      return remotePromise
    }
    try {
      const outcomes = await ingestBoards({
        APP_DB: localPlatform.env.APP_DB,
        BOARD_DB: localPlatform.env.BOARD_DB,
        AI: { run: async (...args) => (await remote()).AI.run(...args) },
        VECTORIZE: {
          upsert: async (...args) => (await remote()).VECTORIZE.upsert(...args),
          deleteByIds: async (...args) => (await remote()).VECTORIZE.deleteByIds(...args),
          getByIds: async (...args) => (await remote()).VECTORIZE.getByIds(...args),
        },
      }, { cachedBoards: sources, sourceOnly: true, retireVectors: false, verifyIndex: true, indexedIds })
      const failed = [...sourceErrors, ...outcomes.filter((outcome) => !outcome.ok)]
      if (failed.length > 0) {
        throw new Error(`Opening bootstrap remains incomplete: ${failed.map((outcome) => `${outcome.board}: ${outcome.error ?? 'index failed'}`).join('; ')}`)
      }
    } finally {
      await remotePlatform?.dispose()
    }
  } finally {
    await localPlatform.dispose()
  }
}

async function main() {
  const { root, stage } = parseArguments(process.argv.slice(2))
  if (!existsSync(join(root, 'worker', 'wrangler.jsonc'))) {
    throw new Error(`Worker configuration is missing at ${join(root, 'worker', 'wrangler.jsonc')}.`)
  }
  await bootstrapSchema(root)
  if (stage === 'schema') {
    console.log('Local development schema is ready.')
    return
  }
  const { userId } = await bootstrapProfile(root)
  if (stage === 'profile') {
    console.log('Local development Profile bootstrap is ready.')
    return
  }
  await bootstrapOpenings(root)
  const state = await bootstrapState(root, userId)
  if (!state.complete) {
    console.error(`Initial demo State remains incomplete: ${state.reason}. Edit the saved Profile filters, then rerun ./dev.sh.`)
    process.exitCode = 2
    return
  }
  console.log('Local development bootstrap is ready.')
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown local schema bootstrap failure.'
  console.error(`Local development setup failed: ${message}`)
  process.exitCode = 1
})
