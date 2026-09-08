import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT_PATH = resolve(
  REPO_ROOT,
  'scripts/check-website-release-inputs.mjs',
)
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

const writeManifest = (repo, packageEntry, version) => {
  write(
    repo,
    join(packageEntry.directory, 'package.json'),
    `${JSON.stringify({ name: packageEntry.name, version }, null, 2)}\n`,
  )
}

const makeReleasedRepo = () => {
  const repo = mkdtempSync(join(tmpdir(), 'foldkit-website-release-inputs-'))
  run(repo, 'git', ['init', '-q'])

  for (const packageEntry of PACKAGES) {
    writeManifest(repo, packageEntry, '1.0.0')
    write(
      repo,
      join(packageEntry.directory, 'source.ts'),
      'export const value = 1\n',
    )
  }
  writeManifest(
    repo,
    { directory: 'packages/other', name: '@foldkit/other' },
    '1.0.0',
  )
  write(repo, 'packages/other/source.ts', 'export const value = 1\n')
  for (const path of SHARED_PACKAGE_INPUTS) {
    write(repo, path, `${path} release input\n`)
  }
  commit(repo, 'release packages')

  for (const packageEntry of PACKAGES) {
    run(repo, 'git', ['tag', `${packageEntry.name}@1.0.0`])
  }

  return repo
}

const check = repo =>
  spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd: repo,
    encoding: 'utf8',
  })

test('rejects changed package source omitted from the exact release commit', () => {
  const repo = makeReleasedRepo()

  try {
    write(
      repo,
      'packages/vite-plugin-foldkit/source.ts',
      'export const value = 2\n',
    )
    writeManifest(repo, PACKAGES.at(0), '1.0.1')
    commit(repo, 'version packages')

    const result = check(repo)

    assert.equal(result.status, 1)
    assert.match(
      result.stderr,
      /packages\/vite-plugin-foldkit differs from its published tag @foldkit\/vite-plugin@1\.0\.0 but was not version bumped in HEAD/,
    )
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
})

test('accepts changed package source versioned by the exact release commit', () => {
  const repo = makeReleasedRepo()

  try {
    write(
      repo,
      'packages/vite-plugin-foldkit/source.ts',
      'export const value = 2\n',
    )
    writeManifest(repo, PACKAGES.at(4), '1.0.1')
    commit(repo, 'version packages')

    const result = check(repo)

    assert.equal(result.status, 0, result.stderr)
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
})

test('rejects a package version bump inherited from an earlier commit', () => {
  const repo = makeReleasedRepo()

  try {
    write(
      repo,
      'packages/vite-plugin-foldkit/source.ts',
      'export const value = 2\n',
    )
    writeManifest(repo, PACKAGES.at(4), '1.0.1')
    commit(repo, 'prepare vite plugin version')

    writeManifest(repo, PACKAGES.at(0), '1.0.1')
    commit(repo, 'version packages')

    const result = check(repo)

    assert.equal(result.status, 1)
    assert.match(
      result.stderr,
      /@foldkit\/vite-plugin@1\.0\.1 has no release tag and was not version bumped in HEAD/,
    )
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
})

test('rejects an existing current-version tag at a different commit', () => {
  const repo = makeReleasedRepo()

  try {
    run(repo, 'git', ['tag', '@foldkit/vite-plugin@1.0.1'])
    writeManifest(repo, PACKAGES.at(4), '1.0.1')
    commit(repo, 'version packages')

    const result = check(repo)

    assert.equal(result.status, 1)
    assert.match(
      result.stderr,
      /@foldkit\/vite-plugin@1\.0\.1 points to [0-9a-f]{40}, expected [0-9a-f]{40}/,
    )
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
})

test('accepts an existing current-version tag at the exact release commit', () => {
  const repo = makeReleasedRepo()

  try {
    writeManifest(repo, PACKAGES.at(4), '1.0.1')
    commit(repo, 'version packages')
    run(repo, 'git', ['tag', '@foldkit/vite-plugin@1.0.1'])

    const result = check(repo)

    assert.equal(result.status, 0, result.stderr)
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
})

test('matching current tags do not hide unpublished shared inputs', () => {
  const repo = makeReleasedRepo()

  try {
    write(repo, 'pnpm-lock.yaml', 'changed dependency graph\n')
    writeManifest(repo, PACKAGES.at(0), '1.0.1')
    commit(repo, 'version packages')
    run(repo, 'git', ['tag', 'foldkit@1.0.1'])

    const result = check(repo)

    assert.equal(result.status, 1)
    assert.match(
      result.stderr,
      /@foldkit\/ui, @foldkit\/devtools, @foldkit\/markdown, @foldkit\/vite-plugin were not version bumped in HEAD/,
    )
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
})

test('rejects changed shared package inputs without a website package bump', () => {
  const repo = makeReleasedRepo()

  try {
    write(repo, 'pnpm-lock.yaml', 'changed dependency graph\n')
    writeManifest(
      repo,
      { directory: 'packages/other', name: '@foldkit/other' },
      '1.0.1',
    )
    commit(repo, 'version an unrelated package')

    const result = check(repo)

    assert.equal(result.status, 1)
    assert.match(
      result.stderr,
      /shared package build inputs differ from the latest published website package release but foldkit, @foldkit\/ui, @foldkit\/devtools, @foldkit\/markdown, @foldkit\/vite-plugin were not version bumped in HEAD/,
    )
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
})

test('allows changed shared package inputs when no package release is attempted', () => {
  const repo = makeReleasedRepo()

  try {
    write(repo, 'pnpm-lock.yaml', 'changed dependency graph\n')
    commit(repo, 'update shared package inputs')

    const result = check(repo)

    assert.equal(result.status, 0, result.stderr)
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
})

test('rejects changed shared package inputs with only one website package bump', () => {
  const repo = makeReleasedRepo()

  try {
    write(repo, 'pnpm-lock.yaml', 'changed dependency graph\n')
    writeManifest(repo, PACKAGES.at(0), '1.0.1')
    commit(repo, 'version packages')

    const result = check(repo)

    assert.equal(result.status, 1)
    assert.match(
      result.stderr,
      /@foldkit\/ui, @foldkit\/devtools, @foldkit\/markdown, @foldkit\/vite-plugin were not version bumped in HEAD/,
    )
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
})

test('accepts changed shared package inputs when every website package is bumped', () => {
  const repo = makeReleasedRepo()

  try {
    write(repo, 'pnpm-lock.yaml', 'changed dependency graph\n')
    for (const packageEntry of PACKAGES) {
      writeManifest(repo, packageEntry, '1.0.1')
    }
    commit(repo, 'version packages')

    const result = check(repo)

    assert.equal(result.status, 0, result.stderr)
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
})
