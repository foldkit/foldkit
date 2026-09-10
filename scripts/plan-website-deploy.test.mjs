import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT_PATH = resolve(REPO_ROOT, 'scripts/plan-website-deploy.mjs')
const PACKAGES = [
  { directory: 'packages/foldkit', name: 'foldkit' },
  { directory: 'packages/ui', name: '@foldkit/ui' },
  { directory: 'packages/devtools', name: '@foldkit/devtools' },
  { directory: 'packages/markdown', name: '@foldkit/markdown' },
  {
    directory: 'packages/vite-plugin-foldkit',
    name: '@foldkit/vite-plugin',
  },
]
const SHARED_PACKAGE_INPUTS = [
  '.npmrc',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'tsconfig.base.json',
]

const run = (cwd, command, args) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' })
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`,
  )
  return result.stdout.trim()
}

const commit = (repo, message) => {
  run(repo, 'git', ['add', '.'])
  run(repo, 'git', [
    '-c',
    'user.name=Foldkit Test',
    '-c',
    'user.email=foldkit@example.com',
    'commit',
    '-q',
    '-m',
    message,
  ])
}

const write = (repo, path, contents) => {
  const target = join(repo, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, contents)
}

const makeReleasedRepo = () => {
  const repo = mkdtempSync(join(tmpdir(), 'foldkit-website-deploy-plan-'))
  run(repo, 'git', ['init', '-q'])
  for (const packageEntry of PACKAGES) {
    write(
      repo,
      join(packageEntry.directory, 'package.json'),
      JSON.stringify({ name: packageEntry.name, version: '1.0.0' }, null, 2) +
        '\n',
    )
    write(
      repo,
      join(packageEntry.directory, 'source.ts'),
      'export const value = 1\n',
    )
  }
  for (const path of SHARED_PACKAGE_INPUTS) {
    write(repo, path, `${path} release input\n`)
  }
  commit(repo, 'release packages')
  for (const packageEntry of PACKAGES) {
    run(repo, 'git', ['tag', `${packageEntry.name}@1.0.0`])
  }
  return repo
}

const plan = repo =>
  spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd: repo,
    encoding: 'utf8',
  })

const planTarget = (repo, target) =>
  spawnSync(process.execPath, [SCRIPT_PATH, target], {
    cwd: repo,
    encoding: 'utf8',
  })

const planReleaseTarget = (repo, target) =>
  spawnSync(
    process.execPath,
    [SCRIPT_PATH, target, '--allow-historical-target'],
    {
      cwd: repo,
      encoding: 'utf8',
    },
  )

test('allows a website-only commit after the package set was released', () => {
  const repo = makeReleasedRepo()
  try {
    write(repo, 'packages/website/page.ts', 'export const page = true\n')
    commit(repo, 'update website')

    const result = plan(repo)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stdout.trim(), 'deploy=true')
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
})

test('allows test-only package changes after the package set was released', () => {
  const repo = makeReleasedRepo()
  try {
    for (const path of [
      'packages/vite-plugin-foldkit/test/viewIdentity.runtime.test.ts',
      'packages/foldkit/source.test.ts',
      'packages/devtools/source.spec.ts',
      'packages/markdown/src/__snapshots__/view.snap',
      'packages/ui/vitest.config.ts',
      'packages/ui/tsconfig.test.json',
    ]) {
      write(repo, path, 'test input\n')
    }
    commit(repo, 'update package tests')

    const result = plan(repo)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stdout.trim(), 'deploy=true')
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
})

test('defers a website deploy while package source is unpublished', () => {
  const repo = makeReleasedRepo()
  try {
    write(repo, 'packages/foldkit/source.ts', 'export const value = 2\n')
    commit(repo, 'change foldkit')
    write(repo, 'packages/website/page.ts', 'export const page = true\n')
    commit(repo, 'update website')

    const result = plan(repo)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stdout.trim(), 'deploy=false')
    assert.match(result.stderr, /packages\/foldkit differs/)
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
})

test('defers a website deploy when a manifest version has no release tag', () => {
  const repo = makeReleasedRepo()
  try {
    run(repo, 'git', ['tag', '-d', '@foldkit/vite-plugin@1.0.0'])

    const result = plan(repo)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stdout.trim(), 'deploy=false')
    assert.match(result.stderr, /has no release tag/)
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
})

test('defers a website deploy when shared package inputs are unpublished', () => {
  const repo = makeReleasedRepo()
  try {
    write(repo, 'pnpm-lock.yaml', 'changed dependency graph\n')
    commit(repo, 'change package inputs')

    const result = plan(repo)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stdout.trim(), 'deploy=false')
    assert.match(result.stderr, /shared package build inputs differ/)
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
})

test('refuses an older target after a newer website commit exists', () => {
  const repo = makeReleasedRepo()
  try {
    const released = run(repo, 'git', ['rev-parse', 'HEAD'])
    write(repo, 'packages/website/page.ts', 'export const page = true\n')
    commit(repo, 'update website')

    const result = planTarget(repo, released)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stdout.trim(), 'deploy=false')
    assert.match(result.stderr, /not the checked-out latest deployment target/)
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
})

test('allows an exact historical release target during finalization', () => {
  const repo = makeReleasedRepo()

  try {
    const released = run(repo, 'git', ['rev-parse', 'HEAD'])

    write(repo, 'packages/website/page.ts', 'export const page = true\n')
    commit(repo, 'update website')
    run(repo, 'git', ['checkout', '-q', released])

    const result = planReleaseTarget(repo, released)

    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stdout.trim(), 'deploy=true')
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
})
