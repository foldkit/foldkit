import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PREPARE = resolve(ROOT, 'scripts/prepare-website-release.mjs')
const CHECK = resolve(ROOT, 'scripts/check-website-release-inputs.mjs')
const CHANGESETS = fileURLToPath(import.meta.resolve('@changesets/cli/bin.js'))
const GENERATED_CHANGESET = '.changeset/generated-website-build-inputs.md'
const PACKAGES = [
  { directory: 'foldkit', name: 'foldkit' },
  { directory: 'ui', name: '@foldkit/ui' },
  { directory: 'devtools', name: '@foldkit/devtools' },
  { directory: 'markdown', name: '@foldkit/markdown' },
  { directory: 'vite-plugin-foldkit', name: '@foldkit/vite-plugin' },
]

const execute = (repo, command, args) =>
  spawnSync(command, args, { cwd: repo, encoding: 'utf8' })

const run = (repo, command, args) => {
  const result = execute(repo, command, args)
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  return result.stdout.trim()
}

const write = (repo, path, contents) => {
  const target = join(repo, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, contents)
}

const writeJson = (repo, path, value) =>
  write(repo, path, `${JSON.stringify(value, null, 2)}\n`)

const commit = (repo, message) => {
  run(repo, 'git', ['add', '.'])
  run(repo, 'git', ['commit', '-qm', message])
}

const fixture = context => {
  const repo = mkdtempSync(join(tmpdir(), 'foldkit-release-coordination-'))
  context.after(() => rmSync(repo, { recursive: true, force: true }))
  run(repo, 'git', ['init', '-q'])
  run(repo, 'git', ['config', 'user.name', 'Foldkit Test'])
  run(repo, 'git', ['config', 'user.email', 'foldkit@example.com'])
  writeJson(repo, 'package.json', {
    name: 'release-fixture',
    private: true,
    packageManager: 'pnpm@11.8.0',
  })
  write(repo, 'pnpm-workspace.yaml', "packages:\n  - 'packages/*'\n")
  write(repo, 'pnpm-lock.yaml', "lockfileVersion: '9.0'\n")
  writeJson(repo, '.changeset/config.json', {
    changelog: false,
    commit: false,
    fixed: [['foldkit', '@foldkit/ui', '@foldkit/devtools']],
    linked: [],
    access: 'public',
    baseBranch: 'main',
    updateInternalDependencies: 'patch',
    ignore: [],
  })
  for (const pkg of PACKAGES) {
    writeJson(repo, `packages/${pkg.directory}/package.json`, {
      name: pkg.name,
      version: '1.0.0',
    })
  }
  commit(repo, 'published baseline')
  run(repo, 'git', ['branch', '-M', 'main'])
  for (const pkg of PACKAGES) {
    run(repo, 'git', ['tag', `${pkg.name}@1.0.0`])
  }
  return repo
}

const addFeature = repo => {
  write(
    repo,
    '.changeset/feature.md',
    "---\n'foldkit': minor\n---\n\nAdd a feature.\n",
  )
  commit(repo, 'add feature changeset')
}

const changeSharedInputs = repo => {
  write(
    repo,
    'pnpm-workspace.yaml',
    "packages:\n  - 'packages/*'\nallowBuilds:\n  esbuild: false\n",
  )
  commit(repo, 'change shared build configuration')
}

const version = repo => {
  run(repo, process.execPath, [CHANGESETS, 'version'])
  commit(repo, 'version packages')
}

const packageVersion = (repo, directory) =>
  JSON.parse(
    readFileSync(join(repo, `packages/${directory}/package.json`), 'utf8'),
  ).version

test('the real versioner reproduces the missing coordination bump without preparation', context => {
  const repo = fixture(context)
  changeSharedInputs(repo)
  addFeature(repo)
  version(repo)

  const result = execute(repo, process.execPath, [CHECK])

  assert.equal(result.status, 1)
  assert.match(result.stderr, /shared package build inputs differ/)
  assert.match(
    result.stderr,
    /@foldkit\/markdown, @foldkit\/vite-plugin were not version bumped/,
  )
})

test('coordination patches preserve a requested minor release and satisfy the publication check', context => {
  const repo = fixture(context)
  changeSharedInputs(repo)
  addFeature(repo)
  run(repo, process.execPath, [PREPARE])
  version(repo)

  assert.equal(packageVersion(repo, 'foldkit'), '1.1.0')
  assert.equal(packageVersion(repo, 'ui'), '1.1.0')
  assert.equal(packageVersion(repo, 'devtools'), '1.1.0')
  assert.equal(packageVersion(repo, 'markdown'), '1.0.1')
  assert.equal(packageVersion(repo, 'vite-plugin-foldkit'), '1.0.1')
  assert.equal(existsSync(join(repo, GENERATED_CHANGESET)), false)
  run(repo, process.execPath, [CHECK])
})

test('unchanged shared inputs preserve a package-specific release plan', context => {
  const repo = fixture(context)
  addFeature(repo)
  run(repo, process.execPath, [PREPARE])

  assert.equal(existsSync(join(repo, GENERATED_CHANGESET)), false)
  version(repo)
  assert.equal(packageVersion(repo, 'markdown'), '1.0.0')
  assert.equal(packageVersion(repo, 'vite-plugin-foldkit'), '1.0.0')
  run(repo, process.execPath, [CHECK])
})

test('preparation includes working-tree shared input changes and is repeatable', context => {
  const repo = fixture(context)
  write(repo, 'pnpm-lock.yaml', "lockfileVersion: '9.0'\nsettings: {}\n")
  run(repo, process.execPath, [PREPARE])
  const first = readFileSync(join(repo, GENERATED_CHANGESET), 'utf8')

  run(repo, process.execPath, [PREPARE])

  assert.equal(readFileSync(join(repo, GENERATED_CHANGESET), 'utf8'), first)
  assert.match(first, /'@foldkit\/markdown': patch/)
})

test('missing release tags stop preparation before changing a changeset', context => {
  const repo = fixture(context)
  changeSharedInputs(repo)
  run(repo, 'git', ['tag', '-d', '@foldkit/markdown@1.0.0'])

  const result = execute(repo, process.execPath, [PREPARE])

  assert.equal(result.status, 1)
  assert.match(result.stderr, /@foldkit\/markdown@1\.0\.0 has no release tag/)
  assert.equal(existsSync(join(repo, GENERATED_CHANGESET)), false)
})

test('preparation includes a newly added shared configuration file', context => {
  const repo = fixture(context)
  write(repo, '.npmrc', 'strict-peer-dependencies=true\n')

  run(repo, process.execPath, [PREPARE])

  assert.equal(existsSync(join(repo, GENERATED_CHANGESET)), true)
})

test('preparation refuses to overwrite different changeset contents', context => {
  const repo = fixture(context)
  changeSharedInputs(repo)
  const authored = "---\n'foldkit': minor\n---\n\nHand-written feature.\n"
  write(repo, GENERATED_CHANGESET, authored)

  const result = execute(repo, process.execPath, [PREPARE])

  assert.equal(result.status, 1)
  assert.match(result.stderr, /already exists with different contents/)
  assert.equal(readFileSync(join(repo, GENERATED_CHANGESET), 'utf8'), authored)
})

test('reverted shared changes remove only the unchanged generated changeset', context => {
  const repo = fixture(context)
  write(repo, 'pnpm-lock.yaml', "lockfileVersion: '9.0'\nsettings: {}\n")
  run(repo, process.execPath, [PREPARE])
  write(repo, 'pnpm-lock.yaml', "lockfileVersion: '9.0'\n")

  run(repo, process.execPath, [PREPARE])

  assert.equal(existsSync(join(repo, GENERATED_CHANGESET)), false)
})

test('a finalized coordinated release does not schedule the same bumps again', context => {
  const repo = fixture(context)
  changeSharedInputs(repo)
  addFeature(repo)
  run(repo, process.execPath, [PREPARE])
  version(repo)
  for (const pkg of PACKAGES) {
    run(repo, 'git', [
      'tag',
      `${pkg.name}@${packageVersion(repo, pkg.directory)}`,
    ])
  }

  run(repo, process.execPath, [PREPARE])

  assert.equal(existsSync(join(repo, GENERATED_CHANGESET)), false)
})
