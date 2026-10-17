import assert from 'node:assert/strict'
import { test } from 'node:test'

import { selectScaffoldTarballs } from './scaffold-dependencies.ts'

const packages = [
  {
    name: 'foldkit',
    tarballPath: '/snapshot/core.tgz',
    peerDependencies: ['effect', '@effect/platform-browser'],
  },
  {
    name: '@foldkit/node',
    tarballPath: '/snapshot/server-adapter.tgz',
    peerDependencies: ['effect', 'foldkit'],
  },
  {
    name: '@foldkit/ui',
    tarballPath: '/snapshot/components.tgz',
    peerDependencies: ['effect', 'foldkit'],
  },
  {
    name: '@foldkit/devtools',
    tarballPath: '/snapshot/devtools.tgz',
    peerDependencies: ['effect', 'foldkit', '@foldkit/ui'],
  },
  {
    name: '@foldkit/vite-plugin',
    tarballPath: '/snapshot/build-plugin.tgz',
    peerDependencies: ['effect', 'foldkit', 'vite'],
  },
  {
    name: '@foldkit/devtools-mcp',
    tarballPath: '/snapshot/devtools-mcp.tgz',
    peerDependencies: ['effect', 'foldkit'],
  },
  {
    name: '@foldkit/oxlint-plugin',
    tarballPath: '/snapshot/lint-plugin.tgz',
    peerDependencies: [],
  },
]

const localPackageNames = [
  ...packages.map(pkg => pkg.name),
  '@foldkit/markdown',
]

const toolingDependencies = {
  '@foldkit/devtools': '1.0.0',
  '@foldkit/vite-plugin': '1.0.0',
  '@foldkit/devtools-mcp': '1.0.0',
  '@foldkit/oxlint-plugin': '1.0.0',
  vite: '8.0.0',
}

for (const rendering of ['SPA', 'SSG']) {
  test(`${rendering} includes its local peers without installing the Node adapter`, () => {
    assert.deepEqual(
      selectScaffoldTarballs(
        {
          dependencies: { effect: '4.0.0', foldkit: '1.0.0' },
          devDependencies: toolingDependencies,
        },
        packages,
        localPackageNames,
      ),
      [
        '/snapshot/core.tgz',
        '/snapshot/components.tgz',
        '/snapshot/devtools.tgz',
        '/snapshot/build-plugin.tgz',
        '/snapshot/devtools-mcp.tgz',
        '/snapshot/lint-plugin.tgz',
      ],
    )
  })
}

test('SSR includes its declared Node adapter and UI packages', () => {
  assert.deepEqual(
    selectScaffoldTarballs(
      {
        dependencies: {
          '@foldkit/node': '1.0.0',
          '@foldkit/ui': '1.0.0',
          effect: '4.0.0',
          foldkit: '1.0.0',
        },
        devDependencies: toolingDependencies,
      },
      packages,
      localPackageNames,
    ),
    [
      '/snapshot/core.tgz',
      '/snapshot/server-adapter.tgz',
      '/snapshot/components.tgz',
      '/snapshot/devtools.tgz',
      '/snapshot/build-plugin.tgz',
      '/snapshot/devtools-mcp.tgz',
      '/snapshot/lint-plugin.tgz',
    ],
  )
})

test('selects runtime dependencies when devDependencies are absent', () => {
  assert.deepEqual(
    selectScaffoldTarballs(
      { dependencies: { foldkit: '1.0.0' } },
      packages,
      localPackageNames,
    ),
    ['/snapshot/core.tgz'],
  )
})

test('selects tooling dependencies and their local peers when dependencies are absent', () => {
  assert.deepEqual(
    selectScaffoldTarballs(
      { devDependencies: { '@foldkit/vite-plugin': '1.0.0' } },
      packages,
      localPackageNames,
    ),
    ['/snapshot/core.tgz', '/snapshot/build-plugin.tgz'],
  )
})

test('a manifest with no local dependencies selects no tarballs', () => {
  assert.deepEqual(
    selectScaffoldTarballs(
      { dependencies: { effect: '4.0.0', '@example/theme': '1.0.0' } },
      packages,
      localPackageNames,
    ),
    [],
  )
  assert.deepEqual(selectScaffoldTarballs({}, packages, localPackageNames), [])
})

test('a declared local dependency without a tarball fails before installation', () => {
  assert.throws(
    () =>
      selectScaffoldTarballs(
        { dependencies: { '@foldkit/markdown': '1.0.0' } },
        packages,
        localPackageNames,
      ),
    /No tarball was packed for local scaffold dependency @foldkit\/markdown/,
  )
})

test('local peer cycles select each package once in snapshot order', () => {
  assert.deepEqual(
    selectScaffoldTarballs(
      { dependencies: { '@example/second': '1.0.0' } },
      [
        {
          name: '@example/first',
          tarballPath: '/snapshot/first.tgz',
          peerDependencies: ['@example/second'],
        },
        {
          name: '@example/second',
          tarballPath: '/snapshot/second.tgz',
          peerDependencies: ['@example/first'],
        },
      ],
      ['@example/first', '@example/second'],
    ),
    ['/snapshot/first.tgz', '/snapshot/second.tgz'],
  )
})
