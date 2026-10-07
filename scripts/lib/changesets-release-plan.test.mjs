import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'

import {
  pendingReleaseForMinimum,
  readChangesetsReleasePlan,
} from './changesets-release-plan.ts'

const PACKAGES = [
  { directory: 'foldkit', name: 'foldkit' },
  { directory: 'ui', name: '@foldkit/ui' },
  { directory: 'devtools', name: '@foldkit/devtools' },
]

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
  return repo
}

test('assembles the fixed-group release without a local main branch', async context => {
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
  const releasePlan = await readChangesetsReleasePlan(repo)

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
