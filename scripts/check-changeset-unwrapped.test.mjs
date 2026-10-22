import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const CHECK = fileURLToPath(
  new URL('./check-changeset-unwrapped.ts', import.meta.url),
)
const INHERITED_CHANGESET = '.changeset/inherited.md'
const BRANCH_CHANGESET = '.changeset/branch.md'

const git = (repo, ...args) => {
  const result = spawnSync(
    'git',
    [
      '-c',
      'user.name=Foldkit Test',
      '-c',
      'user.email=foldkit@example.com',
      '-c',
      'commit.gpgsign=false',
      ...args,
    ],
    { cwd: repo, encoding: 'utf8' },
  )
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
}

const writeChangeset = (repo, file, summary) =>
  writeFileSync(join(repo, file), `---\n'foldkit': patch\n---\n\n${summary}\n`)

const commit = (repo, message) => {
  git(repo, 'add', '.')
  git(repo, 'commit', '-qm', message)
}

const fixture = (context, summary = 'Add a branch change.') => {
  const repo = mkdtempSync(join(tmpdir(), 'foldkit-changeset-unwrapped-'))
  context.after(() => rmSync(repo, { recursive: true, force: true }))
  git(repo, 'init', '-q', '-b', 'main')
  mkdirSync(join(repo, '.changeset'))
  writeChangeset(repo, INHERITED_CHANGESET, 'Add an inherited change.')
  commit(repo, 'add inherited changeset')

  git(repo, 'checkout', '-qb', 'branch')
  writeChangeset(repo, BRANCH_CHANGESET, summary)
  commit(repo, 'add branch changeset')

  git(repo, 'checkout', '-q', 'main')
  git(repo, 'rm', INHERITED_CHANGESET)
  commit(repo, 'consume inherited changeset on main')
  git(repo, 'checkout', '-q', 'branch')

  return repo
}

const check = repo =>
  spawnSync(process.execPath, [CHECK, 'main'], { cwd: repo, encoding: 'utf8' })

test('a diverged main deleting an inherited changeset does not hide a branch changeset', context => {
  const repo = fixture(context)

  const result = check(repo)

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  assert.equal(result.stderr, '')
  assert.equal(
    result.stdout.trim(),
    'Changeset summaries OK: 1 changeset checked against main.',
  )
})

test('a locally deleted branch changeset is rejected after main diverges', context => {
  const repo = fixture(context)
  rmSync(join(repo, BRANCH_CHANGESET))

  const result = check(repo)

  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`)
  assert.match(
    result.stderr,
    /Committed changesets differ from the changesets visible to Changesets CLI\./,
  )
  assert.ok(result.stderr.includes(`  ${BRANCH_CHANGESET}`), result.stderr)
  assert.ok(!result.stderr.includes(INHERITED_CHANGESET), result.stderr)
})

test('a wrapped branch changeset summary is rejected after main diverges', context => {
  const repo = fixture(context, 'Add a branch change\nwith a wrapped summary.')

  const result = check(repo)

  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`)
  assert.match(
    result.stderr,
    /Changeset summaries must keep each paragraph on a single line\./,
  )
  assert.ok(result.stderr.includes(BRANCH_CHANGESET), result.stderr)
  assert.match(result.stderr, /line 6: wraps the paragraph above/)
})
