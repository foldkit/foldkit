import { Array, Option, Record, Schema, pipe } from 'effect'
import { execFile } from 'node:child_process'
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import {
  type EnvironmentOptions,
  type InlineConfig,
  type Plugin,
  type ResolvedConfig,
  type RunnableDevEnvironment,
  type ViteDevServer,
  build,
  createRunnableDevEnvironment,
  createServer,
  isRunnableDevEnvironment,
  resolveConfig,
} from 'vite'
import { describe, expect, it, onTestFinished } from 'vitest'

import { crawlFoldkitPackages } from '../src/foldkitPackages.ts'
import { foldkit } from '../src/index.ts'
import { readForcedEffectEntries } from './forcedEffectEntries.ts'

type Files = Readonly<globalThis.Record<string, string>>
type DependencyFields = Readonly<
  globalThis.Record<string, Readonly<globalThis.Record<string, string>>>
>

const PLUGIN_ROOT = resolve(import.meta.dirname, '..')
const PLUGIN_SOURCE = resolve(PLUGIN_ROOT, 'src/index.ts')
const CHILD_PROCESS_TEST_TIMEOUT_MS = 20_000

const writeFiles = async (root: string, files: Files): Promise<void> => {
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), content)
  }
}

const makeTemporaryDirectory = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'foldkit-resolution-'))
  onTestFinished(async () => {
    await rm(directory, { recursive: true, force: true })
  })
  return directory
}

const makeRoot = async (files: Files): Promise<string> => {
  const root = await makeTemporaryDirectory()
  await writeFiles(root, files)
  return root
}

const prefixPaths = (directory: string, files: Files): Files =>
  Record.mapKeys(files, path => `${directory}/${path}`)

// FIXTURE PACKAGES

const packageManifest = (
  name: string,
  dependencyFields: DependencyFields,
): string =>
  JSON.stringify({
    name,
    version: '1.0.0',
    type: 'module',
    exports: './index.js',
    ...dependencyFields,
  })

const singletonPackage = (
  path: string,
  name: string,
  copy: string,
  dependencyFields: DependencyFields = {},
): Files => ({
  [`${path}/package.json`]: packageManifest(name, dependencyFields),
  [`${path}/index.js`]: `export const instance = { copy: '${copy}' }\n`,
})

const foldkitPackage = (path: string, copy: string): Files =>
  singletonPackage(path, 'foldkit', copy)

const uiPackage = (path: string, copy: string): Files =>
  singletonPackage(path, '@foldkit/ui', copy, {
    peerDependencies: { foldkit: '*' },
  })

const consumerPackage = (
  path: string,
  name: string,
  imported: string,
  dependencyFields: DependencyFields,
): Files => ({
  [`${path}/package.json`]: packageManifest(name, dependencyFields),
  [`${path}/index.js`]: `import { instance } from '${imported}'\nexport const viaConsumer = instance\n`,
})

const relayPackage = (
  path: string,
  name: string,
  imported: string,
  dependencyFields: DependencyFields,
): Files => ({
  [`${path}/package.json`]: packageManifest(name, dependencyFields),
  [`${path}/index.js`]: `export { viaConsumer } from '${imported}'\n`,
})

const markdownPackage = (path: string): Files =>
  consumerPackage(path, '@foldkit/markdown', 'foldkit', {
    peerDependencies: { foldkit: '*' },
  })

const appPackage = (
  dependencies: Readonly<globalThis.Record<string, string>>,
  devDependencies: Readonly<globalThis.Record<string, string>> = {},
): Files => ({
  'package.json': JSON.stringify({
    name: 'app',
    private: true,
    type: 'module',
    dependencies,
    devDependencies,
  }),
})

const entry = (singleton: string, consumer: string): Files => ({
  'entry.js': `export { instance } from '${singleton}'\nexport { viaConsumer } from '${consumer}'\n`,
})

const NESTED_UI_CONSUMER: Files = {
  ...appPackage({ '@foldkit/ui': '*', 'ui-consumer': '*' }),
  ...entry('@foldkit/ui', 'ui-consumer'),
  ...uiPackage('node_modules/@foldkit/ui', 'ROOT_COPY'),
  ...consumerPackage('node_modules/ui-consumer', 'ui-consumer', '@foldkit/ui', {
    dependencies: { '@foldkit/ui': '*' },
  }),
  ...uiPackage(
    'node_modules/ui-consumer/node_modules/@foldkit/ui',
    'NESTED_COPY',
  ),
}

const TRANSITIVE_ONLY_UI: Files = {
  ...appPackage({ 'ui-consumer': '*' }),
  'entry.js': "export { viaConsumer } from 'ui-consumer'\n",
  ...consumerPackage('node_modules/ui-consumer', 'ui-consumer', '@foldkit/ui', {
    dependencies: { '@foldkit/ui': '*' },
  }),
  ...uiPackage(
    'node_modules/ui-consumer/node_modules/@foldkit/ui',
    'NESTED_COPY',
  ),
}

const TRANSITIVE_ONLY_UI_WITH_FOLDKIT: Files = {
  ...TRANSITIVE_ONLY_UI,
  ...appPackage({ foldkit: '*', 'ui-consumer': '*' }),
  ...foldkitPackage('node_modules/foldkit', 'FOLDKIT'),
}

const DECLARED_MARKDOWN_PEER: Files = {
  ...appPackage({
    foldkit: '*',
    '@foldkit/markdown': '*',
    'md-consumer': '*',
  }),
  ...entry('foldkit', 'md-consumer'),
  ...foldkitPackage('node_modules/foldkit', 'ROOT_COPY'),
  ...markdownPackage('node_modules/@foldkit/markdown'),
  ...relayPackage(
    'node_modules/md-consumer',
    'md-consumer',
    '@foldkit/markdown',
    { peerDependencies: { '@foldkit/markdown': '*' } },
  ),
}

const UNDECLARED_MARKDOWN_PEER: Files = {
  ...DECLARED_MARKDOWN_PEER,
  ...appPackage({ foldkit: '*', 'md-consumer': '*' }),
}

const UI_PEER: Files = {
  ...appPackage({ foldkit: '*', '@foldkit/ui': '*', 'ui-peer': '*' }),
  ...foldkitPackage('node_modules/foldkit', 'FOLDKIT'),
  ...uiPackage('node_modules/@foldkit/ui', 'ROOT_COPY'),
  ...consumerPackage('node_modules/ui-peer', 'ui-peer', '@foldkit/ui', {
    peerDependencies: { '@foldkit/ui': '*' },
  }),
}

const SERVER_ENTRY = 'entry.server.js'

const SERVER_RENDER_PACKAGES: Files = {
  ...appPackage({ foldkit: '*', effect: '*' }),
  'node_modules/effect/package.json': JSON.stringify({
    name: 'effect',
    version: '1.0.0',
    type: 'module',
    main: './index.js',
  }),
  'node_modules/effect/index.js': "export * as Schema from './Schema.js'\n",
  'node_modules/effect/Schema.js': 'export const instance = {}\n',
  'node_modules/foldkit/package.json': JSON.stringify({
    name: 'foldkit',
    version: '1.0.0',
    type: 'module',
    exports: {
      '.': './index.js',
      './build-token': './dist/buildToken.js',
    },
  }),
  'node_modules/foldkit/index.js':
    "import { Schema } from 'effect'\n\nexport { injectedBuildId } from './dist/buildToken.js'\nexport const effectSchema = Schema.instance\n",
  'node_modules/foldkit/dist/buildToken.js':
    'const foldkitBuildIdPlaceholder = () => undefined\n\nexport const injectedBuildId = foldkitBuildIdPlaceholder()\n',
  [SERVER_ENTRY]:
    "export { injectedBuildId } from 'foldkit/build-token'\nexport { effectSchema as foldkitEffectSchema } from 'foldkit'\nexport { instance as applicationEffectSchema } from 'effect/Schema'\n",
}

// BUILDS

const pluginConfig = (root: string): InlineConfig => ({
  root,
  configFile: false,
  logLevel: 'silent',
  plugins: foldkit(),
})

const buildFixture = async (
  root: string,
  target: 'Client' | 'Ssr',
  config: InlineConfig = {},
): Promise<string> => {
  const outDir = join(root, `dist-${target}`)

  await build({
    ...pluginConfig(root),
    ...config,
    build: {
      outDir,
      minify: false,
      ...(target === 'Ssr'
        ? { ssr: join(root, 'entry.js') }
        : {
            lib: {
              entry: join(root, 'entry.js'),
              formats: ['es'],
              fileName: 'entry',
            },
          }),
    },
  })

  const entryFile = pipe(
    await readdir(outDir),
    Array.findFirst(file => file.startsWith('entry') && file.endsWith('.js')),
    Option.getOrThrowWith(
      () => new Error(`No entry*.js file in the build output at ${outDir}`),
    ),
  )

  return join(outDir, entryFile)
}

const loadBuild = async (
  root: string,
  target: 'Client' | 'Ssr',
  config: InlineConfig = {},
) => import(pathToFileURL(await buildFixture(root, target, config)).href)

const readSsrBuild = async (root: string): Promise<string> =>
  readFile(await buildFixture(root, 'Ssr'), 'utf8')

// DEV SERVER

const WORKER_OPTIMIZE_DEPS = {
  noDiscovery: false,
  entries: [SERVER_ENTRY],
}

const runnableServerEnvironment = (
  options: EnvironmentOptions,
): EnvironmentOptions => ({
  consumer: 'server',
  dev: {
    createEnvironment: (name, config) =>
      createRunnableDevEnvironment(name, config),
  },
  ...options,
})

const FORCED_EFFECT_ENTRIES = new Set(readForcedEffectEntries())

const resolvedEnvironment = (
  config: ResolvedConfig,
  environmentName: string,
): ResolvedConfig['environments'][string] => {
  const environment = config.environments[environmentName]
  if (environment === undefined) {
    throw new Error(`No ${environmentName} environment`)
  }

  return environment
}

const isEffectEntry = (entry: string): boolean =>
  entry === 'effect' || entry.startsWith('effect/')

const effectEntries = (
  config: ResolvedConfig,
  environmentName: string,
): ReadonlySet<string> =>
  new Set(
    Array.filter(
      resolvedEnvironment(config, environmentName).optimizeDeps.include ?? [],
      isEffectEntry,
    ),
  )

const ServerEntry = Schema.Struct({
  injectedBuildId: Schema.Unknown,
  foldkitEffectSchema: Schema.Unknown,
  applicationEffectSchema: Schema.Unknown,
})

const decodeServerEntry = Schema.decodeUnknownSync(ServerEntry)

const ConsumerEntry = Schema.Struct({
  viaConsumer: Schema.Struct({ copy: Schema.String }),
})

const decodeConsumerEntry = Schema.decodeUnknownSync(ConsumerEntry)

const startDevServer = async (
  files: Files,
  config: InlineConfig,
): Promise<Readonly<{ root: string; server: ViteDevServer }>> => {
  const root = await realpath(await makeRoot(files))
  const server = await createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, ws: false },
    plugins: foldkit({ devToolsMcpPort: false }),
    ...config,
  })
  onTestFinished(() => server.close())

  return { root, server }
}

const runnableEnvironment = (
  server: ViteDevServer,
  environmentName: string,
): RunnableDevEnvironment => {
  const environment = server.environments[environmentName]
  if (environment === undefined || !isRunnableDevEnvironment(environment)) {
    throw new Error(`No runnable ${environmentName} environment`)
  }

  return environment
}

const renderServerEntry = async (
  environmentName: string,
  environments: NonNullable<InlineConfig['environments']>,
): Promise<
  Readonly<{
    serverEntry: typeof ServerEntry.Type
    clientBuildTokenCode: string | undefined
    environment: RunnableDevEnvironment
  }>
> => {
  const { root, server } = await startDevServer(SERVER_RENDER_PACKAGES, {
    environments,
  })
  const environment = runnableEnvironment(server, environmentName)

  const serverEntry = decodeServerEntry(
    await environment.runner.import(`/${SERVER_ENTRY}`),
  )
  const clientBuildTokenTransform =
    await server.environments.client.transformRequest(
      join(root, 'node_modules/foldkit/dist/buildToken.js'),
    )

  return {
    serverEntry,
    clientBuildTokenCode: clientBuildTokenTransform?.code,
    environment,
  }
}

const readOptimizedDependencies = async (
  environment: RunnableDevEnvironment,
): Promise<ReadonlyArray<string>> => {
  const { depsOptimizer } = environment
  if (depsOptimizer === undefined) {
    throw new Error(`No dependency optimizer in ${environment.name}`)
  }

  await depsOptimizer.scanProcessing

  return [
    ...Record.keys(depsOptimizer.metadata.optimized),
    ...Record.keys(depsOptimizer.metadata.discovered),
  ]
}

const expectClientBuildId = (
  rendered: Awaited<ReturnType<typeof renderServerEntry>>,
): void => {
  const { injectedBuildId } = rendered.serverEntry

  expect(typeof injectedBuildId).toBe('string')
  expect(rendered.clientBuildTokenCode).toContain(
    `injectedBuildId = ${JSON.stringify(injectedBuildId)}`,
  )
}

// NOTE: pnpm's `.bin` shims set NODE_PATH for the whole process, and Node's
// own resolver reads it at startup. A child process is the only way to pin
// NODE_PATH, or its absence, for one resolution.
const resolveDedupeInChildProcess = async (
  root: string,
  nodePath: string | undefined,
): Promise<unknown> => {
  await writeFile(
    join(root, 'vite.config.ts'),
    `import { foldkit } from ${JSON.stringify(PLUGIN_SOURCE)}\n\nexport default { logLevel: 'silent', plugins: [foldkit()] }\n`,
  )

  const script = `
    import { resolveConfig } from 'vite'
    const inlineConfig = { root: ${JSON.stringify(root)}, logLevel: 'silent' }
    const serve = await resolveConfig(inlineConfig, 'serve')
    const build = await resolveConfig(inlineConfig, 'build')
    console.log(JSON.stringify({ serve: serve.resolve.dedupe, build: build.resolve.dedupe }))
  `
  const { NODE_PATH: _inherited, ...environment } = process.env
  const result = await promisify(execFile)(
    process.execPath,
    ['--input-type=module', '--eval', script],
    {
      cwd: PLUGIN_ROOT,
      env:
        nodePath === undefined
          ? environment
          : { ...environment, NODE_PATH: nodePath },
    },
  )
  return JSON.parse(result.stdout)
}

const AppManifest = Schema.StructWithRest(
  Schema.Struct({
    devDependencies: Schema.Record(Schema.String, Schema.String),
  }),
  [Schema.Record(Schema.String, Schema.Unknown)],
)

const decodeAppManifest = Schema.decodeUnknownSync(
  Schema.fromJsonString(AppManifest),
)

const ssrOutputWithAndWithout = async (
  files: Files,
  removable: ReadonlyArray<string>,
): Promise<Readonly<{ withPackages: string; withoutPackages: string }>> => {
  const root = await makeRoot(files)
  const withPackages = await readSsrBuild(root)

  for (const name of removable) {
    await rm(join(root, 'node_modules', name), { recursive: true })
  }

  const manifest = decodeAppManifest(
    await readFile(join(root, 'package.json'), 'utf8'),
  )
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      ...manifest,
      devDependencies: Record.filter(
        manifest.devDependencies,
        (_version, name) => !Array.contains(removable, name),
      ),
    }),
  )
  const withoutPackages = await readSsrBuild(root)

  return { withPackages, withoutPackages }
}

describe('Foldkit packages in builds', () => {
  it('shares one copy in a client build when a dependency nests its own', async () => {
    const root = await makeRoot(NESTED_UI_CONSUMER)

    const output = await loadBuild(root, 'Client')

    expect(output.viaConsumer).toBe(output.instance)
  })

  it('shares the root copy in an SSR build when a dependency nests its own', async () => {
    const root = await makeRoot(NESTED_UI_CONSUMER)

    const output = await loadBuild(root, 'Ssr')

    expect(output.viaConsumer).toBe(output.instance)
    expect(output.instance.copy).toBe('ROOT_COPY')
  })

  it('shares one copy in an SSR build with a dependency on the single installed copy', async () => {
    const root = await makeRoot({
      ...appPackage({ '@foldkit/ui': '*', 'ui-consumer': '*' }),
      ...entry('@foldkit/ui', 'ui-consumer'),
      ...uiPackage('node_modules/@foldkit/ui', 'ROOT_COPY'),
      ...consumerPackage(
        'node_modules/ui-consumer',
        'ui-consumer',
        '@foldkit/ui',
        { dependencies: { '@foldkit/ui': '*' } },
      ),
    })

    const output = await loadBuild(root, 'Ssr')

    expect(output.viaConsumer).toBe(output.instance)
  })

  it('shares one copy in an SSR build with a package that peer-depends on foldkit', async () => {
    const root = await makeRoot({
      ...appPackage({ foldkit: '*', 'foldkit-peer': '*' }),
      ...entry('foldkit', 'foldkit-peer'),
      ...foldkitPackage('node_modules/foldkit', 'ROOT_COPY'),
      ...consumerPackage(
        'node_modules/foldkit-peer',
        'foldkit-peer',
        'foldkit',
        {
          peerDependencies: { foldkit: '*' },
        },
      ),
    })

    const output = await loadBuild(root, 'Ssr')

    expect(output.viaConsumer).toBe(output.instance)
  })

  it('shares one copy in an SSR build with a package that peer-depends only on @foldkit/ui', async () => {
    const root = await makeRoot({
      ...appPackage({ foldkit: '*', '@foldkit/ui': '*', 'ui-peer': '*' }),
      ...entry('@foldkit/ui', 'ui-peer'),
      ...foldkitPackage('node_modules/foldkit', 'FOLDKIT'),
      ...uiPackage('node_modules/@foldkit/ui', 'ROOT_COPY'),
      ...consumerPackage('node_modules/ui-peer', 'ui-peer', '@foldkit/ui', {
        peerDependencies: { '@foldkit/ui': '*' },
      }),
    })

    const output = await loadBuild(root, 'Ssr')

    expect(output.viaConsumer).toBe(output.instance)
  })

  it('shares one copy in an SSR build with a package that peer-depends only on @foldkit/markdown', async () => {
    const root = await makeRoot(DECLARED_MARKDOWN_PEER)

    const output = await loadBuild(root, 'Ssr')

    expect(output.viaConsumer).toBe(output.instance)
  })

  it('shares one copy in an SSR build with a package that depends only on @foldkit/markdown', async () => {
    const root = await makeRoot({
      ...appPackage({ foldkit: '*', 'md-consumer': '*' }),
      ...entry('foldkit', 'md-consumer'),
      ...foldkitPackage('node_modules/foldkit', 'ROOT_COPY'),
      ...markdownPackage('node_modules/@foldkit/markdown'),
      ...relayPackage(
        'node_modules/md-consumer',
        'md-consumer',
        '@foldkit/markdown',
        { dependencies: { '@foldkit/markdown': '*' } },
      ),
    })

    const output = await loadBuild(root, 'Ssr')

    expect(output.viaConsumer).toBe(output.instance)
  })

  it('shares the root foldkit in an SSR build when a dependency on @foldkit/markdown nests its own', async () => {
    const root = await makeRoot({
      ...appPackage({ foldkit: '*', 'md-consumer': '*' }),
      ...entry('foldkit', 'md-consumer'),
      ...foldkitPackage('node_modules/foldkit', 'ROOT_COPY'),
      ...relayPackage(
        'node_modules/md-consumer',
        'md-consumer',
        '@foldkit/markdown',
        { dependencies: { '@foldkit/markdown': '*' } },
      ),
      ...markdownPackage(
        'node_modules/md-consumer/node_modules/@foldkit/markdown',
      ),
      ...foldkitPackage(
        'node_modules/md-consumer/node_modules/@foldkit/markdown/node_modules/foldkit',
        'NESTED_COPY',
      ),
    })

    const output = await loadBuild(root, 'Ssr')

    expect(output.viaConsumer).toBe(output.instance)
    expect(output.instance.copy).toBe('ROOT_COPY')
  })

  it('keeps an undeclared @foldkit/markdown peer external in an SSR build', async () => {
    const root = await makeRoot(UNDECLARED_MARKDOWN_PEER)

    const output = await loadBuild(root, 'Ssr')

    expect(output.viaConsumer).not.toBe(output.instance)
  })

  it('shares one copy in an SSR build when the undeclared peer is in ssr.noExternal', async () => {
    const root = await makeRoot(UNDECLARED_MARKDOWN_PEER)

    const output = await loadBuild(root, 'Ssr', {
      ssr: { noExternal: ['@foldkit/markdown'] },
    })

    expect(output.viaConsumer).toBe(output.instance)
  })

  it('shares one copy in an SSR build when the undeclared peer is in resolve.noExternal', async () => {
    const root = await makeRoot(UNDECLARED_MARKDOWN_PEER)

    const output = await loadBuild(root, 'Ssr', {
      resolve: { noExternal: ['@foldkit/markdown'] },
    })

    expect(output.viaConsumer).toBe(output.instance)
  })

  it('crawls private workspace devDependencies through a symlinked root with or without preserveSymlinks', async () => {
    const workspace = await makeRoot({
      'package.json': JSON.stringify({
        name: 'workspace',
        private: true,
        workspaces: ['app', 'packages/*'],
      }),
      ...uiPackage('node_modules/@foldkit/ui', 'ROOT_COPY'),
      ...consumerPackage(
        'node_modules/ui-consumer',
        'ui-consumer',
        '@foldkit/ui',
        { dependencies: { '@foldkit/ui': '*' } },
      ),
      'packages/ui-lib/package.json': JSON.stringify({
        name: 'ui-lib',
        private: true,
        version: '1.0.0',
        type: 'module',
        exports: './index.js',
        peerDependencies: { '@foldkit/ui': '*' },
        devDependencies: { 'ui-consumer': '*' },
      }),
      'packages/ui-lib/index.js': "export { viaConsumer } from 'ui-consumer'\n",
      'app/package.json': JSON.stringify({
        name: 'app',
        private: true,
        type: 'module',
        dependencies: { '@foldkit/ui': '*', 'ui-lib': 'workspace:*' },
      }),
      ...prefixPaths('app', entry('@foldkit/ui', 'ui-lib')),
    })

    await mkdir(join(workspace, 'app/node_modules'), { recursive: true })
    await symlink(
      join(workspace, 'packages/ui-lib'),
      join(workspace, 'app/node_modules/ui-lib'),
      'dir',
    )

    const linkParent = await makeTemporaryDirectory()
    const linkedWorkspace = join(linkParent, 'workspace')
    await symlink(workspace, linkedWorkspace, 'dir')

    const root = join(linkedWorkspace, 'app')
    const preservedFoldkitPackages = await crawlFoldkitPackages(root, true, {
      resolve: { preserveSymlinks: true },
    })
    const output = await loadBuild(root, 'Ssr')

    expect(preservedFoldkitPackages.noExternal).toContain('ui-consumer')
    expect(output.viaConsumer).toBe(output.instance)
  })

  it('loads the nested copy in client and SSR builds when @foldkit/ui is installed only under a dependency', async () => {
    const root = await makeRoot(TRANSITIVE_ONLY_UI)

    const client = await loadBuild(root, 'Client')
    const server = await loadBuild(root, 'Ssr')

    expect([client.viaConsumer.copy, server.viaConsumer.copy]).toEqual([
      'NESTED_COPY',
      'NESTED_COPY',
    ])
  })

  it('bundles an installed singleton the app does not declare into SSR', async () => {
    const root = await makeRoot({
      ...appPackage({}),
      'entry.js': "export { instance } from '@foldkit/ui'\n",
      ...uiPackage('node_modules/@foldkit/ui', 'ROOT_COPY'),
    })

    const code = await readSsrBuild(root)

    expect(code).toContain('ROOT_COPY')
  })

  it('keeps a crawled package in ssr.external out of SSR noExternal', async () => {
    const root = await makeRoot(NESTED_UI_CONSUMER)

    const config = await resolveConfig(
      { ...pluginConfig(root), ssr: { external: ['ui-consumer'] } },
      'build',
    )

    expect(config.environments['ssr']?.resolve.noExternal).not.toContain(
      'ui-consumer',
    )
  })

  it('keeps a crawled package in the SSR environment resolve.external external', async () => {
    const root = await makeRoot(NESTED_UI_CONSUMER)

    const output = await loadBuild(root, 'Ssr', {
      environments: { ssr: { resolve: { external: ['ui-consumer'] } } },
    })

    expect(output.viaConsumer.copy).toBe('NESTED_COPY')
  })

  it('leaves the SSR output unchanged when the crawl finds @foldkit/vite-plugin', async () => {
    const { withPackages, withoutPackages } = await ssrOutputWithAndWithout(
      {
        ...appPackage({ foldkit: '*' }, { '@foldkit/vite-plugin': '*' }),
        ...foldkitPackage('node_modules/foldkit', 'FOLDKIT'),
        'entry.js': "export { instance } from 'foldkit'\n",
        ...consumerPackage(
          'node_modules/@foldkit/vite-plugin',
          '@foldkit/vite-plugin',
          'foldkit',
          { peerDependencies: { foldkit: '*' } },
        ),
      },
      ['@foldkit/vite-plugin'],
    )

    expect(withPackages).toBe(withoutPackages)
  })

  it('leaves the SSR output unchanged when the crawl finds packages that depend only on Foldkit tooling', async () => {
    const { withPackages, withoutPackages } = await ssrOutputWithAndWithout(
      {
        ...appPackage(
          { foldkit: '*' },
          {
            'foldkit-preset': '*',
            'foldkit-lint-config': '*',
            'foldkit-mcp-wrapper': '*',
          },
        ),
        ...foldkitPackage('node_modules/foldkit', 'FOLDKIT'),
        'entry.js': "export { instance } from 'foldkit'\n",
        ...relayPackage(
          'node_modules/foldkit-preset',
          'foldkit-preset',
          '@foldkit/vite-plugin',
          { dependencies: { '@foldkit/vite-plugin': '*' } },
        ),
        ...relayPackage(
          'node_modules/foldkit-lint-config',
          'foldkit-lint-config',
          '@foldkit/oxlint-plugin',
          { dependencies: { '@foldkit/oxlint-plugin': '*' } },
        ),
        ...relayPackage(
          'node_modules/foldkit-mcp-wrapper',
          'foldkit-mcp-wrapper',
          '@foldkit/devtools-mcp',
          { dependencies: { '@foldkit/devtools-mcp': '*' } },
        ),
      },
      ['foldkit-preset', 'foldkit-lint-config', 'foldkit-mcp-wrapper'],
    )

    expect(withPackages).toBe(withoutPackages)
  })

  it('skips malformed dependency fields without dropping valid ones', async () => {
    const root = await makeRoot({
      ...appPackage({
        'ui-consumer': '*',
        'malformed-dependent': '*',
        'partly-malformed-dependent': '*',
      }),
      ...consumerPackage(
        'node_modules/ui-consumer',
        'ui-consumer',
        '@foldkit/ui',
        {
          peerDependencies: { '@foldkit/ui': '*' },
        },
      ),
      'node_modules/malformed-dependent/package.json': JSON.stringify({
        name: 'malformed-dependent',
        version: '1.0.0',
        dependencies: 'foldkit',
        peerDependencies: ['foldkit'],
      }),
      'node_modules/partly-malformed-dependent/package.json': JSON.stringify({
        name: 'partly-malformed-dependent',
        version: '1.0.0',
        dependencies: null,
        peerDependencies: { '@foldkit/ui': '*' },
      }),
    })

    const foldkitPackages = await crawlFoldkitPackages(root, true, {})

    expect(foldkitPackages.noExternal).toEqual([
      'foldkit',
      '@foldkit/ui',
      '@foldkit/devtools',
      'partly-malformed-dependent',
      'ui-consumer',
    ])
  })
})

describe('Foldkit packages in the dev server', () => {
  it('bundles crawled dependents into the server render', async () => {
    const root = await makeRoot(DECLARED_MARKDOWN_PEER)

    const serveConfig = await resolveConfig(pluginConfig(root), 'serve')
    const buildConfig = await resolveConfig(pluginConfig(root), 'build')
    const serveNoExternal = serveConfig.environments['ssr']?.resolve.noExternal

    expect(serveNoExternal).toEqual(
      expect.arrayContaining(['@foldkit/markdown', 'md-consumer']),
    )
    expect(serveNoExternal).toEqual(
      buildConfig.environments['ssr']?.resolve.noExternal,
    )
  })
})

describe('Foldkit packages in every environment', () => {
  it('keeps the client excluding foldkit and pre-bundling the forced Effect entries', async () => {
    const root = await makeRoot(UI_PEER)

    const defaultClient = await resolveConfig(pluginConfig(root), 'serve')
    const clientWithoutDiscovery = await resolveConfig(
      {
        ...pluginConfig(root),
        environments: { client: { optimizeDeps: { noDiscovery: true } } },
      },
      'serve',
    )

    expect(FORCED_EFFECT_ENTRIES).toContain('effect')
    for (const config of [defaultClient, clientWithoutDiscovery]) {
      expect(
        resolvedEnvironment(config, 'client').optimizeDeps.exclude,
      ).toContain('foldkit')
      expect(effectEntries(config, 'client')).toEqual(FORCED_EFFECT_ENTRIES)
    }
  })

  it('excludes foldkit and forces the Effect entries into a client environment under another name', async () => {
    const root = await makeRoot(UI_PEER)

    const config = await resolveConfig(
      {
        ...pluginConfig(root),
        environments: { browser_preview: { consumer: 'client' } },
      },
      'serve',
    )

    expect(
      resolvedEnvironment(config, 'browser_preview').optimizeDeps.exclude,
    ).toContain('foldkit')
    expect(effectEntries(config, 'browser_preview')).toEqual(
      FORCED_EFFECT_ENTRIES,
    )
  })

  it('leaves the optimizer of the default SSR environment disabled', async () => {
    const root = await makeRoot(UI_PEER)

    const config = await resolveConfig(pluginConfig(root), 'serve')

    expect(
      resolvedEnvironment(config, 'ssr').optimizeDeps.include ?? [],
    ).toEqual([])
  })

  it('excludes foldkit and forces the Effect entries into an SSR environment with discovery', async () => {
    const root = await makeRoot(UI_PEER)

    const config = await resolveConfig(
      {
        ...pluginConfig(root),
        environments: { ssr: { optimizeDeps: { noDiscovery: false } } },
      },
      'serve',
    )

    expect(resolvedEnvironment(config, 'ssr').optimizeDeps.exclude).toContain(
      'foldkit',
    )
    expect(effectEntries(config, 'ssr')).toEqual(FORCED_EFFECT_ENTRIES)
  })

  it('adds the forced Effect entries to an SSR environment that includes its own', async () => {
    const root = await makeRoot(UI_PEER)

    const config = await resolveConfig(
      {
        ...pluginConfig(root),
        environments: {
          ssr: {
            optimizeDeps: { noDiscovery: true, include: ['effect/Schema'] },
          },
        },
      },
      'serve',
    )

    expect(resolvedEnvironment(config, 'ssr').optimizeDeps.include).toContain(
      'effect/Schema',
    )
    expect(effectEntries(config, 'ssr')).toEqual(FORCED_EFFECT_ENTRIES)
  })

  it('excludes foldkit and forces the Effect entries into a named server environment with discovery', async () => {
    const root = await makeRoot(UI_PEER)

    const config = await resolveConfig(
      {
        ...pluginConfig(root),
        environments: {
          my_worker: {
            consumer: 'server',
            optimizeDeps: { noDiscovery: false },
          },
        },
      },
      'serve',
    )

    expect(
      resolvedEnvironment(config, 'my_worker').optimizeDeps.exclude,
    ).toContain('foldkit')
    expect(effectEntries(config, 'my_worker')).toEqual(FORCED_EFFECT_ENTRIES)
  })

  it('forces the Effect entries into a server environment whose discovery a later plugin turns on', async () => {
    const root = await makeRoot(UI_PEER)
    const enableDiscoveryPlugin: Plugin = {
      name: 'enable-discovery',
      configEnvironment: name =>
        name === 'my_worker'
          ? { optimizeDeps: { noDiscovery: false } }
          : undefined,
    }

    const config = await resolveConfig(
      {
        ...pluginConfig(root),
        plugins: [foldkit(), enableDiscoveryPlugin],
        environments: { my_worker: { consumer: 'server' } },
      },
      'serve',
    )

    expect(effectEntries(config, 'my_worker')).toEqual(FORCED_EFFECT_ENTRIES)
  })

  it('bundles the crawled packages into a named server environment', async () => {
    const root = await makeRoot(UI_PEER)
    const environments: InlineConfig['environments'] = {
      server_renderer: { consumer: 'server' },
    }
    const commands: ReadonlyArray<'serve' | 'build'> = ['serve', 'build']

    for (const command of commands) {
      const config = await resolveConfig(
        { ...pluginConfig(root), environments },
        command,
      )
      const noExternal = resolvedEnvironment(config, 'server_renderer').resolve
        .noExternal

      expect(noExternal).toEqual(
        expect.arrayContaining([
          'foldkit',
          '@foldkit/ui',
          '@foldkit/devtools',
          'ui-peer',
        ]),
      )
      expect(new Set([noExternal].flat())).toEqual(
        new Set([resolvedEnvironment(config, 'ssr').resolve.noExternal].flat()),
      )
    }
  })

  it('keeps a crawled package in top-level resolve.external external in a named server environment', async () => {
    const { server } = await startDevServer(NESTED_UI_CONSUMER, {
      resolve: { external: ['ui-consumer'] },
      environments: { server_renderer: runnableServerEnvironment({}) },
    })
    const environment = runnableEnvironment(server, 'server_renderer')

    const output = decodeConsumerEntry(
      await environment.runner.import('/entry.js'),
    )

    expect(output.viaConsumer.copy).toBe('NESTED_COPY')
  })

  it('renders with the client build id in an SSR environment with discovery', async () => {
    const rendered = await renderServerEntry('ssr', {
      ssr: { optimizeDeps: WORKER_OPTIMIZE_DEPS },
    })
    const optimizedDependencies = await readOptimizedDependencies(
      rendered.environment,
    )

    expectClientBuildId(rendered)
    expect(optimizedDependencies).toContain('effect')
    expect(optimizedDependencies).not.toContain('foldkit')
    expect(optimizedDependencies).not.toContain('foldkit/build-token')
  })

  it('shares one Effect instance between Foldkit and an application that imports Effect subpaths and keeps excluding foldkit', async () => {
    const rendered = await renderServerEntry('ssr', {
      ssr: {
        resolve: { noExternal: true },
        optimizeDeps: { ...WORKER_OPTIMIZE_DEPS, exclude: ['foldkit'] },
      },
    })

    expect(rendered.serverEntry.foldkitEffectSchema).toBe(
      rendered.serverEntry.applicationEffectSchema,
    )
  })

  it('renders with the client build id in a named server environment with discovery', async () => {
    const rendered = await renderServerEntry('my_worker', {
      my_worker: runnableServerEnvironment({
        resolve: { noExternal: true },
        optimizeDeps: WORKER_OPTIMIZE_DEPS,
      }),
    })
    const optimizedDependencies = await readOptimizedDependencies(
      rendered.environment,
    )

    expectClientBuildId(rendered)
    expect(optimizedDependencies).toContain('effect')
    expect(optimizedDependencies).not.toContain('foldkit')
    expect(optimizedDependencies).not.toContain('foldkit/build-token')
  })

  it('renders with the client build id in a named server environment that sets no noExternal', async () => {
    const rendered = await renderServerEntry('server_renderer', {
      server_renderer: runnableServerEnvironment({}),
    })

    expectClientBuildId(rendered)
  })
})

describe('Foldkit package deduplication', () => {
  it(
    'ignores a singleton reachable only through NODE_PATH',
    async () => {
      const root = await makeRoot(TRANSITIVE_ONLY_UI_WITH_FOLDKIT)

      const dedupe = await resolveDedupeInChildProcess(
        root,
        join(root, 'node_modules/ui-consumer/node_modules'),
      )

      expect(dedupe).toEqual({ serve: ['foldkit'], build: ['foldkit'] })
    },
    CHILD_PROCESS_TEST_TIMEOUT_MS,
  )

  it(
    'lists only the singletons that resolve from the root',
    async () => {
      const root = await makeRoot(TRANSITIVE_ONLY_UI_WITH_FOLDKIT)

      const dedupe = await resolveDedupeInChildProcess(root, undefined)

      expect(dedupe).toEqual({ serve: ['foldkit'], build: ['foldkit'] })
    },
    CHILD_PROCESS_TEST_TIMEOUT_MS,
  )

  it(
    'lists a singleton installed at a workspace root above the app',
    async () => {
      const workspace = await makeRoot({
        'package.json': JSON.stringify({
          name: 'workspace',
          private: true,
          dependencies: { foldkit: '*' },
        }),
        ...foldkitPackage('node_modules/foldkit', 'FOLDKIT'),
        'app/package.json': JSON.stringify({
          name: 'app',
          private: true,
          type: 'module',
        }),
      })

      const dedupe = await resolveDedupeInChildProcess(
        join(workspace, 'app'),
        undefined,
      )

      expect(dedupe).toEqual({ serve: ['foldkit'], build: ['foldkit'] })
    },
    CHILD_PROCESS_TEST_TIMEOUT_MS,
  )

  it('follows a symlinked root under resolve.preserveSymlinks', async () => {
    const workspace = await makeRoot({
      ...foldkitPackage('outer/node_modules/foldkit', 'FOLDKIT'),
      ...consumerPackage(
        'outer/node_modules/foldkit-consumer',
        'foldkit-consumer',
        'foldkit',
        { peerDependencies: { foldkit: '*' } },
      ),
      ...prefixPaths(
        'real/app',
        appPackage({ foldkit: '*', 'foldkit-consumer': '*' }),
      ),
    })

    const root = join(workspace, 'outer/app')
    await symlink(join(workspace, 'real/app'), root, 'dir')

    const preserved = await resolveConfig(
      { ...pluginConfig(root), resolve: { preserveSymlinks: true } },
      'serve',
    )
    const realpathed = await resolveConfig(pluginConfig(root), 'serve')

    expect(preserved.resolve.dedupe).toEqual(['foldkit'])
    expect(preserved.environments['ssr']?.resolve.noExternal).toContain(
      'foldkit-consumer',
    )
    expect(realpathed.resolve.dedupe).toEqual([])
    expect(realpathed.environments['ssr']?.resolve.noExternal).not.toContain(
      'foldkit-consumer',
    )
  })
})
