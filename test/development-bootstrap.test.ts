import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

const repository = new URL('..', import.meta.url).pathname

function run(command: string, args: string[], cwd: string) {
  return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: 'pipe' })
}

function writeFixtureWorktree(root: string) {
  const primary = join(root, 'primary')
  const worktree = join(root, 'worktree')
  mkdirSync(primary, { recursive: true })
  run('git', ['init', '--initial-branch=main'], primary)
  run('git', ['config', 'user.email', 'test@example.com'], primary)
  run('git', ['config', 'user.name', 'Test'], primary)
  writeFileSync(join(primary, '.gitignore'), 'app/.env.local\nworker/.dev.vars.development\nworker/.wrangler/\n')
  writeFileSync(join(primary, 'README.md'), 'fixture\n')
  run('git', ['add', '.'], primary)
  run('git', ['commit', '-m', 'fixture'], primary)
  run('git', ['worktree', 'add', '--detach', worktree], primary)

  for (const directory of [primary, worktree]) {
    cpSync(join(repository, 'dev.sh'), join(directory, 'dev.sh'))
    cpSync(join(repository, 'scripts'), join(directory, 'scripts'), { recursive: true, force: true })
    cpSync(join(repository, 'migrations'), join(directory, 'migrations'), { recursive: true })
    cpSync(join(repository, 'seed'), join(directory, 'seed'), { recursive: true })
    mkdirSync(join(directory, 'app'), { recursive: true })
    mkdirSync(join(directory, 'worker'), { recursive: true })
    symlinkSync(join(repository, 'worker/node_modules'), join(directory, 'worker/node_modules'), 'dir')
    writeFileSync(join(directory, 'worker/wrangler.jsonc'), `{
      "name": "onward-bootstrap-test",
      "main": "src/index.ts",
      "compatibility_date": "2024-10-22",
      "d1_databases": [
        { "binding": "BOARD_DB", "database_name": "onward-boards", "database_id": "boards-test" },
        { "binding": "APP_DB", "database_name": "onward-app", "database_id": "app-test" }
      ],
      "env": { "development": { "d1_databases": [
        { "binding": "BOARD_DB", "database_name": "onward-boards", "database_id": "boards-test" },
        { "binding": "APP_DB", "database_name": "onward-app", "database_id": "app-test" }
      ] } }
    }\n`)
  }

  writeFileSync(join(primary, 'app/.env.local'), 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test\n')
  writeFileSync(join(primary, 'worker/.dev.vars.development'), 'CLERK_JWT_KEY=test\nCLERK_AUTHORIZED_PARTIES=http://localhost:3000\n')
  return { primary, worktree }
}

test('the schema launcher links missing configuration once and preserves a worktree-local Clerk-owned State on repeat', () => {
  const root = mkdtempSync(join(tmpdir(), 'onward-bootstrap-'))
  try {
    const { primary, worktree } = writeFixtureWorktree(root)

    run('./dev.sh', ['schema'], worktree)

    const stateSql = `INSERT INTO users (id, email, name) VALUES ('user_123', 'person@example.com', 'Person');
INSERT INTO state (user_id, opening_id, status, updated_at) VALUES ('user_123', 'opening-123', 'saved', '2026-10-14T00:00:00.000Z');`
    run(join(repository, 'worker/node_modules/.bin/wrangler'), ['d1', 'execute', 'onward-app', '--local', '--persist-to', join(worktree, 'worker/.wrangler/state'), '--command', stateSql, '--config', join(worktree, 'worker/wrangler.jsonc'), '--env', 'development'], worktree)

    run('./dev.sh', ['schema'], worktree)
    const output = run(join(repository, 'worker/node_modules/.bin/wrangler'), ['d1', 'execute', 'onward-app', '--local', '--persist-to', join(worktree, 'worker/.wrangler/state'), '--command', 'SELECT user_id, status FROM state;', '--config', join(worktree, 'worker/wrangler.jsonc'), '--env', 'development'], worktree)
    assert.match(output, /user_123/)
    assert.match(output, /saved/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
