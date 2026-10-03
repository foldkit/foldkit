import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { pendingReleaseForMinimum } from './changesets-release-plan.ts'

const CHANGESETS = fileURLToPath(import.meta.resolve('@changesets/cli/bin.js'))
const PACKAGES = [
  { directory: 'foldkit', name: 'foldkit' },
  { directory: 'ui', name: '@foldkit/ui' },
  { directory: 'devtools', name: '@foldkit/devtools' },
]

const run = (repo, command, args) => {
  const result = spawnSync(command, args, { cwd: repo, encoding: 'utf8' })
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
}

const write = (repo, path, contents) => {
  const target = join(repo, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, contents)
}

const writeJson = (repo, path, value) => {
  write(repo, path, `${JSON.stringify(value, null, 2)}\n`)
}

const makeFixture = context => {
  const repo = mkdtempSync(join(tmpdir(), 'foldkit-changesets-plan-'))
  context.after(() => rmSync(repo, { recursive: true, force: true }))
  run(repo, 'git', ['init', '-q'])
  writeJson(repo, 'package.json', {
    name: 'changesets-plan-fixture',
    version: '1.0.0',
    private: true,
    packageManager: 'pnpm@11.8.0',
  })
  write(repo, 'pnpm-workspace.yaml', "packages:\n  - 'packages/*'\n")
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
  for (const packageEntry of PACKAGES) {
    writeJson(repo, `packages/${packageEntry.directory}/package.json`, {
      name: packageEntry.name,
      version: '1.0.0',
    })
  }
  run(repo, 'git', ['add', '.'])
  run(repo, 'git', [
    '-c',
    'user.name=Foldkit Test',
    '-c',
    'user.email=foldkit@example.com',
    'commit',
    '-qm',
    'published baseline',
  ])
  run(repo, 'git', ['branch', '-M', 'main'])
  return repo
}

test('uses the assembled fixed-group release instead of per-package changesets', context => {
  const repo = makeFixture(context)
  write(
    repo,
    '.changeset/foldkit-fix.md',
    "---\n'foldkit': patch\n---\n\nFix Foldkit.\n",
  )
  write(
    repo,
    '.changeset/ui-feature.md',
    "---\n'@foldkit/ui': minor\n---\n\nAdd a UI feature.\n",
  )
  const releasePlanPath = join(repo, 'release-plan.json')
  run(repo, process.execPath, [
    CHANGESETS,
    'status',
    '--output',
    releasePlanPath,
  ])
  const releasePlan = JSON.parse(readFileSync(releasePlanPath, 'utf8'))

  const foldkitRelease = pendingReleaseForMinimum(
    releasePlan,
    'foldkit',
    '1.1.0',
  )
  const uiRelease = pendingReleaseForMinimum(
    releasePlan,
    '@foldkit/ui',
    '1.1.0',
  )

  assert.equal(foldkitRelease.type, 'minor')
  assert.equal(uiRelease.type, 'minor')
  assert.throws(
    () => pendingReleaseForMinimum(releasePlan, 'foldkit', '1.0.1'),
    /pending Changesets release plan advances it to 1\.1\.0/,
  )
})
