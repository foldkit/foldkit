import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { resolveConfig } from 'vite'

const REPO_ROOT = fileURLToPath(new URL('../', import.meta.url))
const DEPENDENCIES = [
  '@effect/platform-browser',
  'effect/http',
  'effect/persistence',
  '@foldkit/devtools > clsx',
  'foldkit > parse5',
]
const SOURCE_ALIASES = {
  foldkit: 'packages/foldkit/src/index',
  'foldkit/devtools-host': 'packages/foldkit/src/devTools/host',
  '@foldkit/devtools/vite': 'packages/devtools/src/vite',
}
const resolveExample = (slug, command) =>
  resolveConfig(
    {
      root: resolve(REPO_ROOT, 'examples', slug),
      configFile: resolve(REPO_ROOT, 'examples', slug, 'vite.config.ts'),
    },
    command,
  )
const assertDependencies = options => {
  for (const dependency of DEPENDENCIES) {
    assert.ok(options.include.includes(dependency), `missing ${dependency}`)
  }
}
const assertNoDependencies = options => {
  for (const dependency of DEPENDENCIES) {
    assert.ok(!options.include.includes(dependency), `unexpected ${dependency}`)
  }
}

test('real example browser environments declare linked source dependencies', async () => {
  for (const slug of [
    'api-cache-query',
    'counter',
    'ui-showcase',
    'ssr',
    'ssg',
  ]) {
    const config = await resolveExample(slug, 'serve')
    const { client, ssr } = config.environments

    assertDependencies(client.optimizeDeps)
    for (const dependency of ['effect', 'effect/Effect', 'effect/Schema']) {
      assert.ok(client.optimizeDeps.include.includes(dependency))
    }
    assert.ok(client.optimizeDeps.exclude.includes('foldkit'))
    assert.ok(
      !client.optimizeDeps.include.some(entry =>
        /^(foldkit|@foldkit\/devtools)(\/[^ >]+)*$/.test(entry),
      ),
    )
    assertNoDependencies(ssr.optimizeDeps)
    assert.deepEqual(ssr.optimizeDeps.include, [])
    assert.equal(ssr.optimizeDeps.noDiscovery, true)

    for (const [specifier, target] of Object.entries(SOURCE_ALIASES)) {
      assert.equal(
        config.resolve.alias.find(alias => alias.find === specifier)
          ?.replacement,
        resolve(REPO_ROOT, target),
      )
    }
  }
})

test('browser consumer declarations merge without changing server options or builds', async () => {
  const { exampleClientDependencies } =
    await import('../examples/vite.dependencies.ts')
  const serverOptions = {
    include: ['effect/Array'],
    exclude: ['server-only'],
    noDiscovery: true,
    holdUntilCrawlEnd: false,
  }
  const inlineConfig = () => ({
    root: resolve(REPO_ROOT, 'examples/counter'),
    configFile: false,
    plugins: [exampleClientDependencies()],
    environments: {
      client: {
        optimizeDeps: { include: ['effect/Option'], exclude: ['client-only'] },
      },
      browser: {
        consumer: 'client',
        optimizeDeps: { include: ['effect/Option'], exclude: ['browser-only'] },
      },
      ssr: { optimizeDeps: structuredClone(serverOptions) },
    },
  })

  for (const command of ['serve', 'build']) {
    const config = await resolveConfig(inlineConfig(), command)
    for (const name of ['client', 'browser']) {
      const { optimizeDeps } = config.environments[name]
      if (command === 'serve') {
        assertDependencies(optimizeDeps)
      } else {
        assertNoDependencies(optimizeDeps)
      }
      assert.ok(optimizeDeps.include.includes('effect/Option'))
      assert.deepEqual(optimizeDeps.exclude, [`${name}-only`])
    }
    for (const [name, value] of Object.entries(serverOptions)) {
      assert.deepEqual(config.environments.ssr.optimizeDeps[name], value)
    }
    assertNoDependencies(config.environments.ssr.optimizeDeps)
  }

  const serverNamedClient = await resolveConfig(
    {
      ...inlineConfig(),
      environments: {
        client: { consumer: 'server', optimizeDeps: serverOptions },
      },
    },
    'serve',
  )
  assertNoDependencies(serverNamedClient.environments.client.optimizeDeps)
  for (const [name, value] of Object.entries(serverOptions)) {
    assert.deepEqual(
      serverNamedClient.environments.client.optimizeDeps[name],
      value,
    )
  }

  const counterBuild = await resolveExample('counter', 'build')
  for (const environment of Object.values(counterBuild.environments)) {
    assertNoDependencies(environment.optimizeDeps)
  }
})
