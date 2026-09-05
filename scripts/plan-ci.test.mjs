import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT_PATH = 'scripts/plan-ci.mjs'
const ZERO_SHA = '0'.repeat(40)
const MISSING_SHA_A = 'deadbeef'.repeat(5)
const MISSING_SHA_B = 'cafebabe'.repeat(5)
const SCOPES = [
  'create_foldkit_smoke',
  'packed_ssr_consumer',
  'scaffold_server_rendering',
  'host_parity',
  'dom_state_parity',
  'prerender_repeatable',
  'peer_floors',
  'typing_game',
  'website',
  'full_workspace_checks',
  'workspace_packages',
]

const planCi = (...args) => {
  const result = spawnSync(process.execPath, [SCRIPT_PATH, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })

  assert.equal(result.status, 0, `plan-ci.mjs exited ${result.status}`)

  return Object.fromEntries(
    result.stdout
      .split('\n')
      .filter(line => line !== '')
      .map(line => {
        const separatorIndex = line.indexOf('=')
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)]
      }),
  )
}

const planCiForFile = fileName => planCi('base', 'head', fileName)

test('emits every scope exactly once as a boolean', () => {
  const scopes = planCiForFile('README.md')

  assert.deepEqual(Object.keys(scopes).sort(), [...SCOPES].sort())
  for (const value of Object.values(scopes)) {
    assert.ok(value === 'true' || value === 'false', `not a boolean: ${value}`)
  }
})

test('a documentation-only change selects nothing', () => {
  const scopes = planCiForFile('README.md')

  for (const scope of SCOPES) {
    assert.equal(scopes[scope], 'false', `${scope} should be false`)
  }
})

test('a foldkit change reaches the website and the typing game', () => {
  const scopes = planCiForFile('packages/foldkit/src/runtime/runtime.ts')

  assert.equal(scopes['website'], 'true')
  assert.equal(scopes['typing_game'], 'true')
  assert.equal(scopes['workspace_packages'], 'true')
  assert.equal(scopes['full_workspace_checks'], 'false')
})

test('a markdown change reaches the website', () => {
  const scopes = planCiForFile('packages/markdown/src/index.ts')

  assert.equal(scopes['website'], 'true')
  assert.equal(scopes['typing_game'], 'false')
})

test('an example or playground build change reaches the website', () => {
  for (const fileName of [
    'examples/ssg/package.json',
    'examples/ssr/vite.config.ts',
    'scripts/build-examples.ts',
    'scripts/check-playground-ssg-build.ts',
  ]) {
    assert.equal(planCiForFile(fileName)['website'], 'true', fileName)
  }
})

test('a create-foldkit-app change selects the smoke test', () => {
  assert.equal(
    planCiForFile('packages/create-foldkit-app/src/index.ts')[
      'create_foldkit_smoke'
    ],
    'true',
  )
})

test('an oxlint plugin change selects the smoke test', () => {
  assert.equal(
    planCiForFile('packages/oxlint-plugin-foldkit/src/index.ts')[
      'create_foldkit_smoke'
    ],
    'true',
  )
})

test('a foldkit change selects the packed consumer externalization gate', () => {
  // The gate exists for what only an installed Foldkit shows: it is
  // externalized from a server build, so a compile-time define never reaches
  // it. Both packages that decide that have to select it.
  assert.equal(
    planCiForFile('packages/foldkit/src/hydrate.ts')['packed_ssr_consumer'],
    'true',
  )
  assert.equal(
    planCiForFile('packages/vite-plugin-foldkit/src/buildToken.ts')[
      'packed_ssr_consumer'
    ],
    'true',
  )
})

test('a website-only change leaves the packed consumer gate alone', () => {
  assert.equal(
    planCiForFile('packages/website/src/page/landing.ts')[
      'packed_ssr_consumer'
    ],
    'false',
  )
})

test('browser-backed gate manifests select their consumers', () => {
  const ssrManifest = planCiForFile('examples/ssr/package.json')
  assert.equal(ssrManifest['packed_ssr_consumer'], 'true')

  const browserManifest = planCiForFile('packages/examples-e2e/package.json')
  assert.equal(browserManifest['packed_ssr_consumer'], 'true')
  assert.equal(browserManifest['dom_state_parity'], 'true')
})

test('peer floor inputs select their packed-manifest gate', () => {
  for (const fileName of [
    '.changeset/plugin-peer-floor.md',
    'packages/vite-plugin-foldkit/package.json',
    'scripts/check-peer-floors.ts',
    'scripts/reset-peer-deps.ts',
  ]) {
    assert.equal(planCiForFile(fileName)['peer_floors'], 'true', fileName)
  }

  assert.equal(
    planCiForFile('packages/website/src/page/landing.ts')['peer_floors'],
    'false',
  )
})

test('a packed consumer fixture change selects only its focused gate', () => {
  const scopes = planCiForFile(
    'scripts/fixtures/packed-ssr-consumer/src/entry.server.ts',
  )

  assert.equal(scopes['packed_ssr_consumer'], 'true')
  for (const scope of SCOPES.filter(scope => scope !== 'packed_ssr_consumer')) {
    assert.equal(scopes[scope], 'false', `${scope} should be false`)
  }
})

test('a scaffold or framework change selects the generated-app build gate', () => {
  // The gate installs every Foldkit package in a generated app, then runs the
  // scaffold's build command where the build id contract is kept or lost.
  for (const file of [
    'examples/ssg/package.json',
    'examples/ssr/package.json',
    'packages/examples-e2e/package.json',
    'packages/create-foldkit-app/templates/rendering/ssr/vite.config.ts',
    'packages/devtools/src/index.ts',
    'packages/devtools-mcp/src/index.ts',
    'packages/foldkit/src/experimental/server/server.ts',
    'packages/oxlint-plugin-foldkit/src/index.ts',
    'packages/ui/src/button/index.ts',
    'packages/vite-plugin-foldkit/src/buildToken.ts',
  ]) {
    assert.equal(
      planCiForFile(file)['scaffold_server_rendering'],
      'true',
      `${file} should select the gate`,
    )
  }
})

test('an ssr host or framework change selects the host parity gate', () => {
  // The dev host and the generated production host are different code reading
  // one server entry, so either side, or the entry contract between them, can
  // make them disagree.
  for (const file of [
    'examples/ssr/scripts/serve.mjs',
    'packages/vite-plugin-foldkit/src/ssr.ts',
    'packages/foldkit/src/experimental/server/host.ts',
    'packages/foldkit/src/experimental/server/fetch.ts',
  ]) {
    assert.equal(planCiForFile(file)['host_parity'], 'true', file)
  }
})

test('a host parity fixture change selects only its focused gate', () => {
  const scopes = planCiForFile('scripts/fixtures/host-parity/entry.server.ts')

  assert.equal(scopes['host_parity'], 'true')
  for (const scope of SCOPES.filter(scope => scope !== 'host_parity')) {
    assert.equal(scopes[scope], 'false', `${scope} should be false`)
  }
})

test('a typing game change stays out of the website scope', () => {
  const scopes = planCiForFile('packages/typing-game/client/src/main.ts')

  assert.equal(scopes['typing_game'], 'true')
  assert.equal(scopes['website'], 'false')
})

test('website deployment infrastructure selects the website scope', () => {
  for (const file of [
    '.github/workflows/deploy-website-build.yml',
    '.github/workflows/deploy-website-canary.yml',
    '.github/workflows/release.yml',
    'scripts/lib/package-version.d.mts',
    'scripts/lib/package-version.mjs',
    'scripts/website-vercel-config.mjs',
  ]) {
    assert.equal(planCiForFile(file)['website'], 'true', file)
  }
})

test('a lockfile change selects everything, including the typing game', () => {
  const scopes = planCiForFile('pnpm-lock.yaml')

  for (const scope of SCOPES) {
    assert.equal(scopes[scope], 'true', `${scope} should be true`)
  }
})

test('changing the planner forces the conservative fallback', () => {
  const scopes = planCiForFile(SCRIPT_PATH)

  assert.equal(scopes['full_workspace_checks'], 'true')
  assert.equal(scopes['workspace_packages'], 'true')
})

test('changing the shared diff helper forces the conservative fallback', () => {
  const scopes = planCiForFile('scripts/lib/changed-files.mjs')

  assert.equal(scopes['full_workspace_checks'], 'true')
  assert.equal(scopes['workspace_packages'], 'true')
})

test('a workspace-wide change also selects every application scope', () => {
  for (const fileName of ['tsconfig.base.json', '.npmrc', 'pnpm-lock.yaml']) {
    const scopes = planCiForFile(fileName)

    assert.equal(scopes['full_workspace_checks'], 'true', fileName)
    for (const scope of SCOPES) {
      assert.equal(scopes[scope], 'true', `${fileName} should select ${scope}`)
    }
  }
})

test('an all-zero base revision selects everything', () => {
  const scopes = planCi(ZERO_SHA, 'head')

  for (const scope of SCOPES) {
    assert.equal(scopes[scope], 'true', `${scope} should be true`)
  }
})

test('an unresolvable revision range selects everything', () => {
  const scopes = planCi(MISSING_SHA_A, MISSING_SHA_B)

  for (const scope of SCOPES) {
    assert.equal(scopes[scope], 'true', `${scope} should be true`)
  }
})
