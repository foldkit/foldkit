import { Option, Record, Schema, String, pipe } from 'effect'
import { mkdtemp, readFile, rm, utimes } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { type InlineConfig, build, createServer } from 'vite'
import { afterAll, describe, expect, it, onTestFinished, vi } from 'vitest'

import {
  FOLDKIT_SCHEMA_COMPILER_MODULE_ID,
  type FoldkitSchemaCompilerOptions,
  foldkitSchemaCompiler,
} from '../src/schemaCompiler.ts'

const FIXTURE_ROOT = resolve(import.meta.dirname, 'fixtures/schema-compiler')
const SHARED_SCHEMA_PATH = resolve(
  import.meta.dirname,
  'fixtures/schema-compiler-shared/shared.ts',
)
const WATCH_SETTLE_MILLIS = 1500
const WATCH_TIMEOUT = { timeout: 10_000 }

const fixtureConfig = async (
  name: string,
  options: FoldkitSchemaCompilerOptions,
  warnings: Array<string> = [],
): Promise<InlineConfig & Readonly<{ outDir: string }>> => {
  const outDir = resolve(FIXTURE_ROOT, `dist-test/${name}/client`)
  const cacheDir = await mkdtemp(join(tmpdir(), 'foldkit-schema-compiler-'))
  onTestFinished(() => rm(cacheDir, { recursive: true, force: true }))

  return {
    outDir,
    root: FIXTURE_ROOT,
    logLevel: 'silent',
    cacheDir,
    build: {
      outDir,
      minify: false,
      manifest: true,
      modulePreload: { polyfill: false },
      rolldownOptions: {
        onLog: (level, log) => {
          if (level === 'warn') {
            warnings.push(log.message)
          }
        },
      },
    },
    plugins: foldkitSchemaCompiler(options),
  }
}

const buildFixture = async (
  name: string,
  options: FoldkitSchemaCompilerOptions,
): Promise<string> => {
  const config = await fixtureConfig(name, options)
  await build(config)
  return config.outDir
}

const Manifest = Schema.Record(
  Schema.String,
  Schema.Struct({ file: Schema.String }),
)

const entryChunkPath = async (
  outDir: string,
  entry: string = 'index.html',
): Promise<string> => {
  const manifest = Schema.decodeUnknownSync(Schema.fromJsonString(Manifest))(
    await readFile(resolve(outDir, '.vite/manifest.json'), 'utf8'),
  )
  return pipe(
    Record.get(manifest, entry),
    Option.map(({ file }) => resolve(outDir, file)),
    Option.getOrThrowWith(() => new Error(`no ${entry} entry in manifest`)),
  )
}

const buildScriptEntry = async (
  name: string,
  entry: string,
): Promise<Readonly<{ warnings: ReadonlyArray<string>; outDir: string }>> => {
  const warnings: Array<string> = []
  const config = await fixtureConfig(
    name,
    { modules: ['/schema.ts'] },
    warnings,
  )
  await build({
    ...config,
    build: {
      ...config.build,
      rolldownOptions: {
        ...config.build?.rolldownOptions,
        input: resolve(FIXTURE_ROOT, entry),
      },
    },
  })
  return { warnings, outDir: config.outDir }
}

const runEntry = async (outDir: string): Promise<string> => {
  const entry = await entryChunkPath(outDir)
  await import(pathToFileURL(entry).href)
  return readFile(entry, 'utf8')
}

afterAll(async () => {
  await rm(resolve(FIXTURE_ROOT, 'dist-test'), { recursive: true, force: true })
})

describe('foldkitSchemaCompiler', () => {
  it('installs compiled parsers before the application entry runs', async () => {
    const outDir = await buildFixture('installs', { modules: ['/schema.ts'] })
    const source = await runEntry(outDir)

    const maybeInstallIndex = String.indexOf('install([')(source)
    const maybeApplicationIndex = String.indexOf('decodedUser')(source)
    expect(Option.isSome(maybeInstallIndex)).toBe(true)
    expect(
      Option.getOrThrow(maybeApplicationIndex) >
        Option.getOrThrow(maybeInstallIndex),
    ).toBe(true)

    expect(Reflect.get(globalThis, 'decodedUser')).toEqual({
      name: 'Ada',
      age: 36,
    })
  })

  it('resolves module paths through the project aliases', async () => {
    const config = await fixtureConfig('alias', { modules: ['@schema'] })
    await build({
      ...config,
      resolve: { alias: { '@schema': resolve(FIXTURE_ROOT, 'schema.ts') } },
    })
    const source = await runEntry(config.outDir)

    expect(Option.isSome(String.indexOf('install([')(source))).toBe(true)
  })

  it('fails the build when a configured module cannot be resolved', async () => {
    await expect(
      buildFixture('missing', { modules: ['/missing.ts'] }),
    ).rejects.toThrow(/\[foldkit\] Schema compiler: .*"\/missing\.ts"/)
  })

  it('names the configured path when a module throws while loading', async () => {
    await expect(
      buildFixture('broken', { modules: ['/broken.ts'] }),
    ).rejects.toThrow(
      /\[foldkit\] Schema compiler: [^\n]*"\/broken\.ts": document is not defined/,
    )
  })

  it('accepts an absolute module path outside the project root', async () => {
    const outDir = await buildFixture('outside-root', {
      modules: [SHARED_SCHEMA_PATH],
    })
    const source = await runEntry(outDir)

    expect(Option.isSome(String.indexOf('install([')(source))).toBe(true)
  })

  it('warns when the client build has no HTML entry to install into', async () => {
    const { warnings } = await buildScriptEntry('no-html', 'main.ts')

    expect(
      warnings.some(warning =>
        warning.includes(FOLDKIT_SCHEMA_COMPILER_MODULE_ID),
      ),
    ).toBe(true)
  })

  it('installs into a script entry that imports the module by hand', async () => {
    const { warnings, outDir } = await buildScriptEntry('by-hand', 'manual.ts')
    const source = await readFile(
      await entryChunkPath(outDir, 'manual.ts'),
      'utf8',
    )

    expect(Option.isSome(String.indexOf('install([')(source))).toBe(true)
    expect(
      warnings.some(warning =>
        warning.includes(FOLDKIT_SCHEMA_COMPILER_MODULE_ID),
      ),
    ).toBe(false)
  })

  it('resolves the module to an empty module on the dev server', async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), 'foldkit-schema-compiler-'))
    onTestFinished(() => rm(cacheDir, { recursive: true, force: true }))
    const server = await createServer({
      root: FIXTURE_ROOT,
      configFile: false,
      logLevel: 'silent',
      cacheDir,
      optimizeDeps: { noDiscovery: true, include: [] },
      plugins: foldkitSchemaCompiler({ modules: ['/schema.ts'] }),
      server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    })
    onTestFinished(() => server.close())

    await expect(server.transformRequest('/manual.ts')).resolves.not.toBeNull()
    await server.ssrLoadModule('/manual.ts')
    expect(Reflect.get(globalThis, 'manuallyDecodedUser')).toEqual({
      name: 'Ada',
      age: 36,
    })
  })

  it('settles after a schema module changes in watch mode', async () => {
    const config = await fixtureConfig('watch', { modules: ['/schema.ts'] })
    const watcher = await build({
      ...config,
      build: { ...config.build, watch: {} },
    })
    if (!('on' in watcher)) {
      throw new Error('vite build did not return a watcher')
    }
    onTestFinished(() => watcher.close())

    let completedBuildCount = 0
    watcher.on('event', event => {
      if (event.code === 'BUNDLE_END') {
        completedBuildCount++
        event.result.close()
      }
    })
    await vi.waitFor(() => expect(completedBuildCount).toBe(1), WATCH_TIMEOUT)

    const touchedAt = new Date()
    await utimes(resolve(FIXTURE_ROOT, 'schema.ts'), touchedAt, touchedAt)
    await vi.waitFor(() => expect(completedBuildCount).toBe(2), WATCH_TIMEOUT)
    await new Promise(resolveSettle =>
      setTimeout(resolveSettle, WATCH_SETTLE_MILLIS),
    )

    expect(completedBuildCount).toBe(2)
  })
})
