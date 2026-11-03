import assert from 'node:assert/strict'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  assertPackedPeerCompatibility,
  readStagedChangesets,
  selectPlannedPackageVersions,
} from './packed-consumer-staging.mjs'

test('legacy prerelease metadata is migrated only in staging before reading changeset IDs', async context => {
  const fixture = mkdtempSync(join(tmpdir(), 'foldkit-packed-pre-state-'))
  context.after(() => rmSync(fixture, { recursive: true, force: true }))

  const root = join(fixture, 'workspace')
  const outputDirectory = join(fixture, 'stage')
  const changesetDirectory = join(root, '.changeset')
  mkdirSync(changesetDirectory, { recursive: true })

  const preStatePath = join(changesetDirectory, 'pre.json')
  const changesetPath = join(changesetDirectory, 'previous.md')
  const preState = `${JSON.stringify({
    mode: 'pre',
    tag: 'beta',
    initialVersions: { foldkit: '0.170.0' },
    changesets: ['previous'],
  })}\n`
  const changeset = '---\nfoldkit: minor\n---\nAlready released in beta.\n'
  writeFileSync(preStatePath, preState)
  writeFileSync(changesetPath, changeset)

  const staged = await readStagedChangesets({ root, outputDirectory })

  assert.equal(readFileSync(preStatePath, 'utf8'), preState)
  assert.equal(readFileSync(changesetPath, 'utf8'), changeset)
  assert.equal(existsSync(join(changesetDirectory, 'pre')), false)
  assert.deepEqual(staged.preState, { mode: 'pre', tag: 'beta' })
  assert.deepEqual(
    staged.changesets.map(({ id }) => id),
    ['pre/previous'],
  )
})

test('planned versions are applied without mutating packed source manifests', () => {
  const packageJsons = [
    { name: 'foldkit', version: '0.170.0' },
    {
      name: '@foldkit/ui',
      version: '0.170.0',
      peerDependencies: { foldkit: '>=0.171.0' },
    },
    { name: '@foldkit/node', version: '0.170.0' },
  ]
  const releases = [
    { name: 'foldkit', newVersion: '0.171.0' },
    { name: '@foldkit/ui', newVersion: '0.171.0' },
  ]
  const originalPackageJsons = structuredClone(packageJsons)

  const planned = selectPlannedPackageVersions(packageJsons, releases)

  assert.deepEqual(
    planned.map(({ name, version }) => [name, version]),
    [
      ['foldkit', '0.171.0'],
      ['@foldkit/ui', '0.171.0'],
      ['@foldkit/node', '0.170.0'],
    ],
  )
  assert.deepEqual(packageJsons, originalPackageJsons)
  assertPackedPeerCompatibility(planned.map(packageJson => ({ packageJson })))
})

test('an incomplete Changesets plan fails when an unchanged internal peer is too old', () => {
  const packageJsons = [
    { name: 'foldkit', version: '0.170.0' },
    {
      name: '@foldkit/ui',
      version: '0.171.0',
      peerDependencies: { foldkit: '>=0.171.0' },
    },
  ]
  const planned = selectPlannedPackageVersions(packageJsons, [
    { name: '@foldkit/ui', newVersion: '0.171.0' },
  ])

  assert.throws(
    () =>
      assertPackedPeerCompatibility(
        planned.map(packageJson => ({ packageJson })),
      ),
    /Pending Changesets plan is incompatible.*foldkit@>=0\.171\.0.*planned foldkit@0\.170\.0/,
  )
})

test('a peer floor mutation cannot be hidden by selecting planned package versions', () => {
  const packageJsons = [
    { name: 'foldkit', version: '0.170.0' },
    {
      name: '@foldkit/ui',
      version: '0.170.0',
      peerDependencies: { foldkit: '>=0.171.0' },
    },
  ]
  const planned = selectPlannedPackageVersions(packageJsons, [
    { name: 'foldkit', newVersion: '0.171.0' },
    { name: '@foldkit/ui', newVersion: '0.171.0' },
  ])
  const mutated = planned.map(packageJson => ({
    ...packageJson,
    version: packageJson.name === 'foldkit' ? '0.170.0' : packageJson.version,
  }))

  assert.throws(
    () =>
      assertPackedPeerCompatibility(
        mutated.map(packageJson => ({ packageJson })),
      ),
    /does not accept planned foldkit@0\.170\.0/,
  )
})
