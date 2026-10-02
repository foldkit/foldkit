import assert from 'node:assert/strict'
import { test } from 'node:test'

import { engineRangeFailures } from './engine-ranges.mjs'

const VITE_RANGE = '^20.19.0 || >=22.12.0'

const installed = {
  foldkit: { version: '0.165.0', engines: { node: '>=20.19.0' } },
  vite: { version: '8.3.1', engines: { node: VITE_RANGE } },
  effect: { version: '4.0.0' },
}

const readInstalled = (_pkg, dependencyName) => installed[dependencyName]

const failuresFor = packageJson =>
  engineRangeFailures(
    [{ packageJson: { name: '@foldkit/sample', ...packageJson } }],
    readInstalled,
  )

test('accepts a range that every dependency and required peer accepts', () => {
  assert.deepEqual(
    failuresFor({
      engines: { node: VITE_RANGE },
      dependencies: { effect: '4.0.0' },
      peerDependencies: { foldkit: '>=0.165.0', vite: '^8.0.0' },
    }),
    [],
  )
})

test('rejects a package with no Node range', () => {
  assert.deepEqual(failuresFor({}), [
    '@foldkit/sample declares no engines.node range.',
  ])
})

test('rejects a range that semver cannot parse', () => {
  assert.deepEqual(failuresFor({ engines: { node: 'twenty' } }), [
    '@foldkit/sample declares engines.node "twenty", which is not a semver range.',
  ])
})

test('rejects a clause that another clause already covers', () => {
  assert.deepEqual(
    failuresFor({ engines: { node: '>=20.19.0 || >=22.12.0' } }),
    [
      '@foldkit/sample declares engines.node ">=20.19.0 || >=22.12.0". The clause ">=22.12.0" adds nothing, because another clause already accepts every version it names.',
    ],
  )
})

test('reports a repeated clause once', () => {
  assert.equal(
    failuresFor({ engines: { node: '>=20.19.0 || >=20.19.0' } }).length,
    1,
  )
})

test('reports only the later of two equal clauses spelled differently', () => {
  assert.deepEqual(failuresFor({ engines: { node: '>=20 || >=20.0.0' } }), [
    '@foldkit/sample declares engines.node ">=20 || >=20.0.0". The clause ">=20.0.0" adds nothing, because another clause already accepts every version it names.',
  ])
})

test('rejects a floor below the floor of a required peer', () => {
  assert.deepEqual(
    failuresFor({
      engines: { node: '>=18.0.0' },
      peerDependencies: { foldkit: '>=0.165.0' },
    }),
    [
      '@foldkit/sample declares engines.node ">=18.0.0" but requires foldkit@0.165.0, which needs ">=20.19.0". The package accepts Node versions that foldkit rejects.',
    ],
  )
})

test('rejects a range that accepts the Node versions Vite excludes', () => {
  assert.deepEqual(
    failuresFor({
      engines: { node: '>=20.19.0' },
      peerDependencies: { vite: '^8.0.0' },
    }),
    [
      `@foldkit/sample declares engines.node ">=20.19.0" but requires vite@8.3.1, which needs "${VITE_RANGE}". The package accepts Node versions that vite rejects.`,
    ],
  )
})

test('does not compare against an optional peer', () => {
  assert.deepEqual(
    failuresFor({
      engines: { node: '>=20.19.0' },
      peerDependencies: { vite: '^8.0.0' },
      peerDependenciesMeta: { vite: { optional: true } },
    }),
    [],
  )
})

test('rejects a required dependency that is not installed', () => {
  assert.deepEqual(
    failuresFor({
      engines: { node: '>=20.19.0' },
      dependencies: { absent: '^1.0.0' },
    }),
    [
      '@foldkit/sample requires absent, which is not installed, so its Node range cannot be compared.',
    ],
  )
})
