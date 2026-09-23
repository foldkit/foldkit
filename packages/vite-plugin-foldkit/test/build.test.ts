import { Schema } from 'effect'
import { execFile } from 'node:child_process'
import { readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { win32 } from 'node:path'
import { promisify } from 'node:util'
import { type Plugin, type ViteBuilder, createBuilder } from 'vite'
import { afterAll, describe, expect, it, onTestFinished } from 'vitest'

import {
  type FoldkitBuildOptions,
  foldkitBuild,
  manifestPath,
  renderTargetFor,
} from '../src/build.ts'
import { foldkitBuildToken } from '../src/buildToken.ts'
import {
  type FoldkitBuildApi,
  FoldkitBuildManifest,
  FoldkitBuildMetadata,
  foldkit,
} from '../src/index.ts'

const FIXTURE_ROOT = resolve(import.meta.dirname, 'fixtures/build')
const SERVER_ENTRY = '/entry.server.ts'

const filesUnder = async (
  directory: string,
): Promise<ReadonlyArray<string>> => {
  const entries = await readdir(directory, {
    recursive: true,
    withFileTypes: true,
  })
  return entries
    .filter(entry => entry.isFile())
    .map(entry =>
      join(entry.parentPath, entry.name).slice(directory.length + 1),
    )
    .sort()
}

// Each build gets its own output directories so the cases can run concurrently
// and so one case never reads what another wrote.
const buildFixture = async (
  name: string,
  options: Omit<FoldkitBuildOptions, 'clientOutDir' | 'serverOutDir'> & {
    clientOutDir?: string
  } = {},
  extraPlugins: ReadonlyArray<Plugin> = [],
  fixtureRoot: string = FIXTURE_ROOT,
  trailingPlugins: ReadonlyArray<Plugin> = [],
): Promise<Readonly<{ client: string; server: string }>> => {
  const client = `dist-test/${name}/client`
  const server = `dist-test/${name}/server`

  // Registered before the build so a case that asserts a failing build still
  // cleans up what the build wrote before it failed.
  onTestFinished(async () => {
    await rm(resolve(fixtureRoot, `dist-test/${name}`), {
      recursive: true,
      force: true,
    })
  })

  const builder = await createBuilder({
    root: fixtureRoot,
    logLevel: 'silent',
    plugins: [
      ...extraPlugins,
      ...foldkitBuildToken('test-build', false),
      foldkitBuild(SERVER_ENTRY, {
        ...options,
        clientOutDir: client,
        serverOutDir: server,
      }),
      ...trailingPlugins,
    ],
  })
  await builder.buildApp()

  return {
    client: resolve(fixtureRoot, options.clientOutDir ?? client),
    server: resolve(fixtureRoot, server),
  }
}

afterAll(async () => {
  await rm(resolve(FIXTURE_ROOT, 'dist-test'), { recursive: true, force: true })
})

describe('foldkitBuild', () => {
  it('builds the browser bundle and the server bundle in one build', async () => {
    const { client, server } = await buildFixture('both')

    expect(await filesUnder(server)).toEqual(['fetch.js', 'foldkit.build.json'])
    expect(await filesUnder(client)).not.toContain('index.html')

    const { pathToFileURL } = await import('node:url')
    const built = await import(pathToFileURL(resolve(server, 'fetch.js')).href)
    expect(typeof built.default.fetch).toBe('function')
    expect(typeof built.renderPage).toBe('function')
    expect(built).not.toHaveProperty('template')
  })

  it('keeps the template out of the browser build', async () => {
    const { client, server } = await buildFixture('template-private', {
      prerender: { paths: ['/about'] },
    })

    const files = await filesUnder(client)
    expect(files).toContain('about/index.html')
    expect(files).not.toContain('index.html')

    const { pathToFileURL } = await import('node:url')
    const built = await import(pathToFileURL(resolve(server, 'fetch.js')).href)
    const response: Response = await built.default.fetch(
      new Request('http://localhost/'),
    )
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('>/</main>')
  })

  it('serves the Request.url the platform constructed', async () => {
    const { server } = await buildFixture('platform-origin')
    const { pathToFileURL } = await import('node:url')
    const built = await import(pathToFileURL(resolve(server, 'fetch.js')).href)
    const response = await built.default.fetch(
      new Request('https://app.example/about'),
    )
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('>/about</main>')
  })

  it('bakes the browser build template, not the source HTML', async () => {
    const { server } = await buildFixture('fetch-template')
    const bundle = await readFile(resolve(server, 'fetch.js'), 'utf8')
    expect(bundle).not.toContain('./entry.client.ts')
    expect(bundle).toContain('assets/')
  })

  it('generates a page for every path the entry lists', async () => {
    const { client } = await buildFixture('generated', { prerender: true })

    expect(await filesUnder(client)).toContain('about/index.html')

    const about = await readFile(resolve(client, 'about/index.html'), 'utf8')
    expect(about).toContain('<main data-foldkit-app="app"')
    expect(about).toContain('data-foldkit-build="test-build"')
    expect(about).toContain('>/about</main>')
    expect(about).toContain('<title>Fixture /about</title>')
  })

  it('generates the root path over the template it renders into', async () => {
    const { client } = await buildFixture('root', { prerender: true })

    const index = await readFile(resolve(client, 'index.html'), 'utf8')
    expect(index).toContain('>/</main>')
    expect(index).not.toContain('<div id="root"></div>')
  })

  // Two builds of one project produce the same bytes, which is what lets a
  // deployment compare them.
  it('generates the same pages when the build runs again', async () => {
    const first = await buildFixture('repeat-one', { prerender: true })
    const second = await buildFixture('repeat-two', { prerender: true })

    expect(
      await readFile(resolve(second.client, 'index.html'), 'utf8'),
    ).toEqual(await readFile(resolve(first.client, 'index.html'), 'utf8'))
  })

  // NOTE: a later hook writes a different template to disk. Generation must
  // use the template captured from Vite's bundle, not the disk file.
  it('uses the captured template even when the disk index differs', async () => {
    const clientDir = 'dist-test/disk-template/client'
    const corruptClientIndex: Plugin = {
      name: 'test:corrupt-client-index',
      // NOTE: the marker is a meta element rather than the title, which
      // injection rewrites from the render's own Document. A corrupted title
      // is gone from the page it produced, so a test that watched the title
      // would pass against a build that read the file.
      async writeBundle() {
        await writeFile(
          resolve(FIXTURE_ROOT, clientDir, 'index.html'),
          '<!doctype html><html><head><title>Fixture</title><meta name="came-from-disk" content="yes" /></head><body><div id="root"></div></body></html>',
        )
      },
    }

    const { client } = await buildFixture(
      'disk-template',
      { prerender: true },
      [corruptClientIndex],
    )

    const [index, about] = await Promise.all([
      readFile(resolve(client, 'index.html'), 'utf8'),
      readFile(resolve(client, 'about/index.html'), 'utf8'),
    ])

    expect(index).not.toContain('came-from-disk')
    expect(about).not.toContain('came-from-disk')
    expect(about).toContain('>/about</main>')
  })

  it('generates only the configured paths when the build names them', async () => {
    const { client } = await buildFixture('configured', {
      prerender: { paths: ['/about'] },
    })

    const files = await filesUnder(client)
    expect(files).toContain('about/index.html')
    expect(files).not.toContain('index.html')
  })

  // The fixture renders `url.pathname` into the page, so a request built by
  // string concatenation would generate a page reading `//about` here.
  it('renders the same path it writes when the origin carries a trailing slash', async () => {
    const { client } = await buildFixture('trailing-origin', {
      prerender: { paths: ['/about'], origin: 'https://app.example/' },
    })

    expect(
      await readFile(resolve(client, 'about/index.html'), 'utf8'),
    ).toContain('>/about</main>')
  })

  it('renders against the origin the build configures', async () => {
    const { client } = await buildFixture('origin', {
      prerender: { paths: ['/'], origin: 'https://app.example' },
    })

    expect(await readFile(resolve(client, 'index.html'), 'utf8')).toContain(
      '>/</main>',
    )
  })

  // A host has to decide what its asset layer does with a request that matches
  // no file, and the build is what knows: which paths became files, and whether
  // there is a server to reach. Writing it down is what lets a deployment target
  // derive that instead of asking its user to configure it a second time.
  it('reports what it built for whatever deploys it', async () => {
    const { server } = await buildFixture('manifest', { prerender: true })

    const manifest: FoldkitBuildManifest = JSON.parse(
      await readFile(resolve(server, 'foldkit.build.json'), 'utf8'),
    )

    expect(manifest.prerendered).toEqual(['/', '/about'])
    expect(manifest.serverEntry).toBe('fetch.js')
    expect(manifest.client).toContain('client')
    expect(manifest.server).toContain('server')
    expect('host' in manifest).toBe(false)
  })

  it('reports no generated paths when the build generates none', async () => {
    const { server } = await buildFixture('manifest-none')

    const manifest: FoldkitBuildManifest = JSON.parse(
      await readFile(resolve(server, 'foldkit.build.json'), 'utf8'),
    )

    expect(manifest.prerendered).toEqual([])
    expect(manifest.serverEntry).toBe('fetch.js')
  })

  // The manifest describes the deployment, and the browser build is the part of
  // it the public reaches, so a file that names internal directories does not
  // belong in what gets served.
  it('keeps the manifest out of the published browser build', async () => {
    const { client } = await buildFixture('manifest-private', {
      prerender: true,
    })

    expect(await filesUnder(client)).not.toContain('foldkit.build.json')
  })

  it('refuses to write a result that carries a response of its own', async () => {
    await expect(
      buildFixture('responded', { prerender: { paths: ['/redirect'] } }),
    ).rejects.toThrow(/cannot write the complete Response/)
  })
})

// A generated path can come from application data, so it is treated as
// untrusted input: it names a URL, and the file it writes has to stay inside
// the browser build no matter which platform's rules apply. The Windows cases
// run everywhere because `path.slice(1)` is a relative path on POSIX and a
// drive-absolute or drive-relative path on Windows.
describe('renderTargetFor', () => {
  const CLIENT = win32.resolve('C:/build/client')
  const ORIGIN = 'https://app.example'

  const generated = (path: string): string =>
    renderTargetFor(CLIENT, path, ORIGIN, win32).file

  it('writes the root path to the browser build index', () => {
    expect(generated('/')).toBe(win32.join(CLIENT, 'index.html'))
  })

  it('writes a nested path under the browser build', () => {
    expect(generated('/docs/api')).toBe(
      win32.join(CLIENT, 'docs', 'api', 'index.html'),
    )
  })

  it('returns the URL the validation resolved, for the render to use', () => {
    expect(renderTargetFor(CLIENT, '/docs/api', ORIGIN, win32).url.href).toBe(
      'https://app.example/docs/api',
    )
  })

  it('refuses a protocol-relative path before anything can render it', () => {
    expect(() => generated('//169.254.169.254/latest/meta-data')).toThrow(
      /foldkit/,
    )
  })

  for (const path of [
    '/C:/outside',
    '/D:outside',
    '/C:/Windows/System32',
    '//server/share/outside',
  ]) {
    it(`refuses the drive or UNC path "${path}"`, () => {
      expect(() => generated(path)).toThrow(/foldkit/)
    })
  }

  for (const path of ['/../outside', '/docs/../../outside', '/./docs']) {
    it(`refuses the dot-segment path "${path}"`, () => {
      expect(() => generated(path)).toThrow(/foldkit/)
    })
  }

  for (const path of ['/docs?query=1', '/docs#fragment']) {
    it(`refuses the non-path input "${path}"`, () => {
      expect(() => generated(path)).toThrow(/foldkit/)
    })
  }

  it('refuses a percent-encoded separator', () => {
    expect(() => generated('/docs%2f..%2foutside')).toThrow(/foldkit/)
  })

  it('refuses a percent-encoded NUL', () => {
    expect(() => generated('/docs%00evil')).toThrow(/foldkit/)
  })
})

describe('manifestPath', () => {
  // Across drives `path.win32.relative` has no relative answer and returns the
  // absolute destination — the machine-specific path the manifest must never
  // carry.
  it('refuses an output directory on another volume', () => {
    expect(() =>
      manifestPath('C:\\project', 'D:\\output\\client', win32),
    ).toThrow(/foldkit/)
  })

  it('records a same-volume directory relative to the root', () => {
    expect(manifestPath('C:\\project', 'dist\\client', win32)).toBe(
      'dist/client',
    )
  })
})

describe('the build manifest', () => {
  // The manifest is a file something else writes the next time it builds, so a
  // consumer decodes it rather than trusting the shape it finds.
  it('decodes what the build writes', async () => {
    const { server } = await buildFixture('manifest-decode', {
      prerender: true,
    })

    const manifest = Schema.decodeUnknownSync(FoldkitBuildManifest)(
      JSON.parse(await readFile(resolve(server, 'foldkit.build.json'), 'utf8')),
    )

    expect(manifest.schemaVersion).toBe(1)
    expect(manifest.prerendered).toEqual(['/', '/about'])
  })

  it('refuses a manifest from a version it does not know', () => {
    const decode = () =>
      Schema.decodeUnknownSync(FoldkitBuildManifest)({
        schemaVersion: 2,
        client: 'dist/client',
        server: 'dist/server',
        serverEntry: 'entry.server.js',
        prerendered: [],
      })

    expect(decode).toThrow()
  })

  it('refuses a manifest missing its version', () => {
    const decode = () =>
      Schema.decodeUnknownSync(FoldkitBuildManifest)({
        client: 'dist/client',
        server: 'dist/server',
        serverEntry: 'entry.server.js',
        prerendered: [],
      })

    expect(decode).toThrow()
  })

  // An absolute output directory describes this machine rather than the build,
  // and the manifest travels with the build.
  it('records directories relative to the Vite root', async () => {
    const { server } = await buildFixture('manifest-absolute', {
      prerender: true,
      clientOutDir: resolve(FIXTURE_ROOT, 'dist-test/manifest-absolute/client'),
    })

    const manifest = Schema.decodeUnknownSync(FoldkitBuildManifest)(
      JSON.parse(await readFile(resolve(server, 'foldkit.build.json'), 'utf8')),
    )

    expect(manifest.client).toBe('dist-test/manifest-absolute/client')
    expect(manifest.client.startsWith('/')).toBe(false)
  })
})

const UNRELATED_ROOT = resolve(import.meta.dirname, 'fixtures/build-unrelated')
const EVALUATION_ROOT = resolve(
  import.meta.dirname,
  'fixtures/build-evaluation',
)

describe('foldkitBuild orchestration', () => {
  // A host framework owns the order its environments build in, but ordering
  // them is not opting out of what makes the output deployable: without the
  // generated pages and the manifest the build is only half done, silently.
  const hostOrchestrator = (): Plugin => ({
    name: 'test:host-build-app',
    config: () => ({
      builder: {
        buildApp: async builder => {
          for (const environment of Object.values(builder.environments)) {
            await builder.build(environment)
          }
        },
      },
    }),
  })

  it('finishes the build when a host orchestrates the environments', async () => {
    const { client, server } = await buildFixture(
      'host-orchestrated',
      { prerender: { paths: ['/about'] } },
      [hostOrchestrator()],
    )

    expect(await filesUnder(client)).toContain('about/index.html')
    expect(await filesUnder(server)).toContain('foldkit.build.json')
  })

  // Vite merges each plugin's config in plugin order, so with Foldkit listed
  // first a later host's `builder.buildApp` replaces whatever Foldkit put
  // there. Finalization lives in the composable `buildApp` plugin hook for
  // exactly this reason; both orders have to finish the build.
  it('finishes the build when the host plugin comes after Foldkit', async () => {
    const { client, server } = await buildFixture(
      'host-after',
      { prerender: { paths: ['/about'] } },
      [],
      FIXTURE_ROOT,
      [hostOrchestrator()],
    )

    expect(await filesUnder(client)).toContain('about/index.html')
    expect(await filesUnder(server)).toContain('foldkit.build.json')
  })

  // The server bundle renders into the browser build's `index.html`, so a
  // client that emits no HTML entry leaves the fetch handler with nothing to
  // render into. That is a failed build, not one to stay quiet about.
  it('refuses to build the fetch handler without an HTML entry', async () => {
    const jsOnlyClient: Plugin = {
      name: 'test:js-only-client',
      config: () => ({
        environments: {
          client: {
            build: { rolldownOptions: { input: { app: '/entry.client.ts' } } },
          },
        },
      }),
    }

    await expect(buildFixture('js-client', {}, [jsOnlyClient])).rejects.toThrow(
      /has not emitted index\.html/,
    )
  })

  // A host that builds `ssr` before `client` asks for the template before the
  // browser build has produced it. Reading `dist/client/index.html` from disk
  // would hand the handler the previous build's shell with its old asset
  // hashes, and the build would report success. The build fails instead.
  it('refuses to build the fetch handler before the browser build', async () => {
    const ssrFirst: Plugin = {
      name: 'test:ssr-first',
      config: () => ({
        builder: {
          buildApp: async builder => {
            const environments = Object.values(builder.environments)
            const ssr = environments.filter(
              environment => environment.name === 'ssr',
            )
            const others = environments.filter(
              environment => environment.name !== 'ssr',
            )
            for (const environment of [...ssr, ...others]) {
              await builder.build(environment)
            }
          },
        },
      }),
    }

    await expect(buildFixture('ssr-first', {}, [ssrFirst])).rejects.toThrow(
      /has not emitted index\.html/,
    )
  })

  // Prerendering imports what this selects and runs it in the build process, so
  // it selects the configured entry rather than whichever chunk sorts first.
  it('imports the configured entry rather than another input', async () => {
    const secondInput: Plugin = {
      name: 'test:second-ssr-input',
      config: () => ({
        environments: {
          ssr: {
            build: {
              rolldownOptions: {
                input: {
                  unrelated: '/unrelated.ts',
                  'entry.server': '/entry.server.ts',
                },
              },
            },
          },
        },
      }),
    }

    const { client } = await buildFixture(
      'second-input',
      { prerender: { paths: ['/about'] } },
      [secondInput],
      UNRELATED_ROOT,
    )

    expect(
      await readFile(resolve(client, 'about/index.html'), 'utf8'),
    ).toContain('>/about</main>')
  })

  // The import runs application code with the build's privileges, so a build
  // that generates nothing must never reach it. The fixture's entry writes a
  // marker file the moment its module scope runs — asserting on that observes
  // the evaluation itself, where the bundle exists whether or not anything
  // imported it.
  it('imports no server entry when it generates no pages', async () => {
    const { server } = await buildFixture('no-import', {}, [], EVALUATION_ROOT)

    await expect(
      readFile(resolve(server, 'evaluation-marker.txt'), 'utf8'),
    ).rejects.toThrow()
  })

  // Rendering runs application code that may fetch from `Request.url`, so an
  // invalid path has to be refused before the entry sees it — not on the way
  // to writing the file. The fixture logs every render beside its bundle;
  // a build given only a hostile path must fail with no log at all.
  it('refuses an invalid path before the entry can render it', async () => {
    let server = ''
    await expect(
      buildFixture(
        'invalid-path',
        { prerender: { paths: ['//169.254.169.254/latest/meta-data'] } },
        [],
        EVALUATION_ROOT,
      ).then(built => {
        server = built.server
      }),
    ).rejects.toThrow(/foldkit/)

    server = resolve(EVALUATION_ROOT, 'dist-test/invalid-path/server')
    await expect(
      readFile(resolve(server, 'render-log.txt'), 'utf8'),
    ).rejects.toThrow()
  })

  // The positive control: the same fixture, with generation on, must write the
  // marker — otherwise the assertion above passes because the marker never
  // works, not because nothing was imported.
  it('evaluates the entry exactly when it generates pages', async () => {
    const { server } = await buildFixture(
      'with-import',
      { prerender: true },
      [],
      EVALUATION_ROOT,
    )

    expect(
      await readFile(resolve(server, 'evaluation-marker.txt'), 'utf8'),
    ).toBe('evaluated')
  })
})

const CONFIG_ROOT = resolve(import.meta.dirname, 'fixtures/build-config')
const NO_HYDRATION_ROOT = resolve(
  import.meta.dirname,
  'fixtures/build-no-hydration',
)
const VITE_BIN = resolve(import.meta.dirname, '../node_modules/.bin/vite')
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/

// The exported config is the path applications run, so one CLI build proves
// its client and server environments join the same identity session. The
// programmatic case below separately proves that session ends with the build.
describe('the build id across environments', () => {
  it('compiles one id into both bundles of a single build', async () => {
    onTestFinished(async () => {
      await rm(resolve(CONFIG_ROOT, 'dist-test'), {
        recursive: true,
        force: true,
      })
    })

    const { FOLDKIT_BUILD_ID: _supplied, ...environment } = process.env
    await promisify(execFile)(VITE_BIN, ['build'], {
      cwd: CONFIG_ROOT,
      env: environment,
    })

    const client = resolve(CONFIG_ROOT, 'dist-test/config/client')
    const server = resolve(CONFIG_ROOT, 'dist-test/config/server')
    const clientAssets = await readdir(resolve(client, 'assets'))
    const clientBundle = await readFile(
      resolve(
        client,
        'assets',
        clientAssets.filter(f => f.endsWith('.js'))[0] ?? '',
      ),
      'utf8',
    )
    const serverBundle = await readFile(resolve(server, 'fetch.js'), 'utf8')

    const inClient = UUID.exec(clientBundle)?.[0]
    const inServer = UUID.exec(serverBundle)?.[0]

    expect(inClient).toBeDefined()
    expect(inServer).toBe(inClient)
  })

  it('uses the environment override in both bundles and prerendered pages', async () => {
    const buildId = 'environment-build-id'
    onTestFinished(async () => {
      await rm(resolve(CONFIG_ROOT, 'dist-test'), {
        recursive: true,
        force: true,
      })
    })

    await promisify(execFile)(VITE_BIN, ['build'], {
      cwd: CONFIG_ROOT,
      env: { ...process.env, FOLDKIT_BUILD_ID: buildId },
    })

    const client = resolve(CONFIG_ROOT, 'dist-test/config/client')
    const server = resolve(CONFIG_ROOT, 'dist-test/config/server')
    const clientAssets = await readdir(resolve(client, 'assets'))
    const clientBundle = await readFile(
      resolve(
        client,
        'assets',
        clientAssets.filter(file => file.endsWith('.js'))[0] ?? '',
      ),
      'utf8',
    )
    const serverBundle = await readFile(resolve(server, 'fetch.js'), 'utf8')
    const page = await readFile(resolve(client, 'index.html'), 'utf8')

    expect(clientBundle).toContain(buildId)
    expect(serverBundle).toContain(buildId)
    expect(page).toContain(`data-foldkit-build="${buildId}"`)
  })

  it.each(['before', 'after'])(
    'shares one identity when a host orchestrator comes %s Foldkit',
    async order => {
      const outputRoot = `dist-test/host-${order}`
      const clientOutDir = `${outputRoot}/client`
      const serverOutDir = `${outputRoot}/server`
      const hostOrchestrator: Plugin = {
        name: `test:host-${order}`,
        config: () => ({
          builder: {
            buildApp: async builder => {
              const client = builder.environments['client']
              const ssr = builder.environments['ssr']
              if (client === undefined || ssr === undefined) {
                throw new Error('expected client and ssr environments')
              }

              await builder.build(client)
              await builder.build(ssr)
            },
          },
        }),
      }
      const foldkitPlugins = foldkit({
        ssr: {
          serverEntry: '/entry.server.ts',
          build: { clientOutDir, serverOutDir },
        },
      })
      const plugins =
        order === 'before'
          ? [hostOrchestrator, foldkitPlugins]
          : [foldkitPlugins, hostOrchestrator]
      const builder = await createBuilder({
        root: CONFIG_ROOT,
        configFile: false,
        logLevel: 'silent',
        plugins,
      })
      onTestFinished(async () => {
        await rm(resolve(CONFIG_ROOT, outputRoot), {
          recursive: true,
          force: true,
        })
      })

      await builder.buildApp()

      const clientAssets = await readdir(
        resolve(CONFIG_ROOT, clientOutDir, 'assets'),
      )
      const clientBundle = await readFile(
        resolve(
          CONFIG_ROOT,
          clientOutDir,
          'assets',
          clientAssets.filter(file => file.endsWith('.js'))[0] ?? '',
        ),
        'utf8',
      )
      const serverBundle = await readFile(
        resolve(CONFIG_ROOT, serverOutDir, 'fetch.js'),
        'utf8',
      )
      const inClient = UUID.exec(clientBundle)?.[0]
      const inServer = UUID.exec(serverBundle)?.[0]

      expect(inClient).toBeDefined()
      expect(inServer).toBe(inClient)
    },
  )

  it('allows a build whose server returns a response without hydrating', async () => {
    const clientOutDir = 'dist-test/no-hydration/client'
    const serverOutDir = 'dist-test/no-hydration/server'
    const builder = await createBuilder({
      root: NO_HYDRATION_ROOT,
      configFile: false,
      logLevel: 'silent',
      plugins: [
        foldkit({
          ssr: {
            serverEntry: '/entry.server.ts',
            build: { clientOutDir, serverOutDir },
          },
        }),
      ],
    })
    onTestFinished(async () => {
      await rm(resolve(NO_HYDRATION_ROOT, 'dist-test'), {
        recursive: true,
        force: true,
      })
    })

    await builder.buildApp()

    const serverBundle = await readFile(
      resolve(NO_HYDRATION_ROOT, serverOutDir, 'fetch.js'),
      'utf8',
    )
    expect(serverBundle).not.toMatch(UUID)
  })

  it('generates a fresh coordinated id for a later build in one process', async () => {
    const clientOutDir = 'dist-test/repeated/client'
    const serverOutDir = 'dist-test/repeated/server'
    onTestFinished(async () => {
      await rm(resolve(CONFIG_ROOT, 'dist-test/repeated'), {
        recursive: true,
        force: true,
      })
    })

    const buildOnce = async (): Promise<string> => {
      const builder = await createBuilder({
        root: CONFIG_ROOT,
        configFile: false,
        logLevel: 'silent',
        plugins: [
          foldkit({
            ssr: {
              serverEntry: '/entry.server.ts',
              build: {
                clientOutDir,
                serverOutDir,
                prerender: { paths: ['/'] },
              },
            },
          }),
        ],
      })
      await builder.buildApp()

      const page = await readFile(
        resolve(CONFIG_ROOT, clientOutDir, 'index.html'),
        'utf8',
      )
      const buildId = UUID.exec(page)?.[0]
      expect(buildId).toBeDefined()

      const clientAssets = await readdir(
        resolve(CONFIG_ROOT, clientOutDir, 'assets'),
      )
      const clientBundle = await readFile(
        resolve(
          CONFIG_ROOT,
          clientOutDir,
          'assets',
          clientAssets.filter(file => file.endsWith('.js'))[0] ?? '',
        ),
        'utf8',
      )
      const serverBundle = await readFile(
        resolve(CONFIG_ROOT, serverOutDir, 'fetch.js'),
        'utf8',
      )
      expect(clientBundle).toContain(buildId)
      expect(serverBundle).toContain(buildId)
      return buildId ?? ''
    }

    const first = await buildOnce()
    const second = await buildOnce()

    expect(second).not.toBe(first)
  })

  it('isolates identities between concurrent coordinated builds', async () => {
    const buildOnce = async (name: string): Promise<string> => {
      const outputRoot = `dist-test/${name}`
      const clientOutDir = `${outputRoot}/client`
      const serverOutDir = `${outputRoot}/server`
      const builder = await createBuilder({
        root: CONFIG_ROOT,
        cacheDir: `${outputRoot}/cache`,
        configFile: false,
        logLevel: 'silent',
        plugins: [
          foldkit({
            ssr: {
              serverEntry: '/entry.server.ts',
              build: {
                clientOutDir,
                serverOutDir,
                prerender: { paths: ['/'] },
              },
            },
          }),
        ],
      })
      await builder.buildApp()

      const page = await readFile(
        resolve(CONFIG_ROOT, clientOutDir, 'index.html'),
        'utf8',
      )
      const buildId = UUID.exec(page)?.[0]
      expect(buildId).toBeDefined()

      const clientAssets = await readdir(
        resolve(CONFIG_ROOT, clientOutDir, 'assets'),
      )
      const clientBundle = await readFile(
        resolve(
          CONFIG_ROOT,
          clientOutDir,
          'assets',
          clientAssets.filter(file => file.endsWith('.js'))[0] ?? '',
        ),
        'utf8',
      )
      const serverBundle = await readFile(
        resolve(CONFIG_ROOT, serverOutDir, 'fetch.js'),
        'utf8',
      )
      expect(clientBundle).toContain(buildId)
      expect(serverBundle).toContain(buildId)
      return buildId ?? ''
    }

    onTestFinished(async () => {
      await Promise.all([
        rm(resolve(CONFIG_ROOT, 'dist-test/concurrent-a'), {
          recursive: true,
          force: true,
        }),
        rm(resolve(CONFIG_ROOT, 'dist-test/concurrent-b'), {
          recursive: true,
          force: true,
        }),
      ])
    })

    const [first, second] = await Promise.all([
      buildOnce('concurrent-a'),
      buildOnce('concurrent-b'),
    ])

    expect(second).not.toBe(first)
  })

  it('refuses a server artifact that explicitly externalizes Foldkit', async () => {
    const externalizeFoldkit: Plugin = {
      name: 'test:externalize-foldkit',
      config: () => ({
        environments: {
          ssr: {
            resolve: {
              external: ['foldkit'],
            },
          },
        },
      }),
    }
    const builder = await createBuilder({
      root: CONFIG_ROOT,
      configFile: false,
      logLevel: 'silent',
      plugins: [
        foldkit({
          ssr: {
            serverEntry: '/entry.server.ts',
            build: {
              clientOutDir: 'dist-test/external/client',
              serverOutDir: 'dist-test/external/server',
            },
          },
        }),
        externalizeFoldkit,
      ],
    })
    onTestFinished(async () => {
      await rm(resolve(CONFIG_ROOT, 'dist-test/external'), {
        recursive: true,
        force: true,
      })
    })

    await expect(builder.buildApp()).rejects.toThrow(
      /Foldkit singleton package was externalized from the ssr artifact/,
    )
  })
})

const CONTAINER_ROOT = resolve(import.meta.dirname, 'fixtures/build-container')

// A project names its container once and both the dev host and the build have
// to use that name. Injection defaulting to its own `root` fails the build on
// an id the project no longer uses.
it('generates into the container the build names', async () => {
  const { client } = await buildFixture(
    'container',
    { prerender: { paths: ['/'], containerId: 'app-root' } },
    [],
    CONTAINER_ROOT,
  )

  const generated = await readFile(resolve(client, 'index.html'), 'utf8')
  expect(generated).toContain('>/</main>')
  expect(generated).not.toContain('<div id="app-root"></div>')
})

// BUILD METADATA

const METADATA_NOT_READY =
  '[foldkit] build metadata is not available. Read it after a successful builder.buildApp().'

const metadataApi = (builder: ViteBuilder): FoldkitBuildApi => {
  const api: FoldkitBuildApi | undefined = builder.config.plugins.find(
    plugin => plugin.name === 'foldkit:build',
  )?.api

  if (api === undefined) {
    throw new Error('Missing Foldkit build plugin')
  }

  return api
}

const metadataFixture = async (
  name: string,
  options: FoldkitBuildOptions = { prerender: true },
  pluginsBeforeFoldkit: ReadonlyArray<Plugin> = [],
  pluginsAfterFoldkit: ReadonlyArray<Plugin> = [],
) => {
  const directory = `dist-test/metadata-${name}`
  onTestFinished(() =>
    rm(resolve(FIXTURE_ROOT, directory), { recursive: true, force: true }),
  )

  const builder = await createBuilder({
    configFile: false,
    root: FIXTURE_ROOT,
    logLevel: 'silent',
    plugins: [
      ...pluginsBeforeFoldkit,
      foldkitBuildToken('test-build'),
      foldkitBuild(SERVER_ENTRY, {
        clientOutDir: `${directory}/client`,
        serverOutDir: `${directory}/server`,
        ...options,
      }),
      ...pluginsAfterFoldkit,
    ],
  })

  return { builder, directory }
}

describe('completed build metadata', () => {
  it('exposes a frozen serializable snapshot after a completed build', async () => {
    const fixture = await metadataFixture('completed')
    await fixture.builder.buildApp()

    const metadata = metadataApi(fixture.builder).getBuildMetadata()
    expect(metadata.root).toBe(FIXTURE_ROOT)
    expect(metadata.clientDirectory).toBe(
      resolve(FIXTURE_ROOT, fixture.directory, 'client'),
    )
    expect(metadata.serverDirectory).toBe(
      resolve(FIXTURE_ROOT, fixture.directory, 'server'),
    )
    expect(metadata.manifest.prerendered).toEqual(['/', '/about'])
    expect(metadata.serverEntry).toBe(
      resolve(FIXTURE_ROOT, fixture.directory, 'server/fetch.js'),
    )
    expect(await filesUnder(metadata.clientDirectory)).toContain(
      'about/index.html',
    )
    expect(await filesUnder(metadata.serverDirectory)).toContain('fetch.js')
    expect(Object.isFrozen(metadata)).toBe(true)
    expect(Object.isFrozen(metadata.manifest)).toBe(true)
    expect(Object.isFrozen(metadata.manifest.prerendered)).toBe(true)
    expect(
      Schema.decodeUnknownSync(FoldkitBuildMetadata)(
        JSON.parse(JSON.stringify(metadata)),
      ),
    ).toEqual(metadata)
    expect(
      JSON.parse(
        await readFile(
          resolve(metadata.serverDirectory, 'foldkit.build.json'),
          'utf8',
        ),
      ),
    ).toEqual(metadata.manifest)
  })

  it('refuses metadata before the first build', async () => {
    const fixture = await metadataFixture('not-ready')
    expect(() => metadataApi(fixture.builder).getBuildMetadata()).toThrow(
      METADATA_NOT_READY,
    )
  })

  it('uses host-overridden directories for metadata and generated files', async () => {
    const directory = 'dist-test/metadata-overridden'
    const client = `${directory}/host-client`
    const server = `${directory}/host-server`
    const fixture = await metadataFixture(
      'overridden',
      { prerender: true },
      [],
      [
        {
          name: 'test:override-output',
          config: () => ({
            environments: {
              client: { build: { outDir: client } },
              ssr: { build: { outDir: server } },
            },
          }),
        },
      ],
    )
    await fixture.builder.buildApp()
    const metadata = metadataApi(fixture.builder).getBuildMetadata()
    expect(metadata.clientDirectory).toBe(resolve(FIXTURE_ROOT, client))
    expect(metadata.serverDirectory).toBe(resolve(FIXTURE_ROOT, server))
    expect(metadata.manifest.client).toBe(client)
    expect(metadata.manifest.server).toBe(server)
    expect(await filesUnder(metadata.clientDirectory)).toContain(
      'about/index.html',
    )
    expect(
      JSON.parse(
        await readFile(
          resolve(metadata.serverDirectory, 'foldkit.build.json'),
          'utf8',
        ),
      ),
    ).toEqual(metadata.manifest)
  })

  it('reports the emitted nested hashed entry filename', async () => {
    const fixture = await metadataFixture(
      'hashed-entry',
      { prerender: true },
      [],
      [
        {
          name: 'test:hashed-entry',
          config: () => ({
            environments: {
              ssr: {
                build: {
                  rolldownOptions: {
                    output: { entryFileNames: 'entries/[name]-[hash].js' },
                  },
                },
              },
            },
          }),
        },
      ],
    )
    await fixture.builder.buildApp()
    const metadata = metadataApi(fixture.builder).getBuildMetadata()
    expect(metadata.manifest.serverEntry).toMatch(/^entries\/fetch-.+\.js$/)
    expect(metadata.serverEntry).toBe(
      resolve(metadata.serverDirectory, metadata.manifest.serverEntry),
    )
    expect(await filesUnder(metadata.serverDirectory)).toContain(
      metadata.manifest.serverEntry,
    )
  })

  for (const sharedConfigBuild of [false, true]) {
    it(`shares config-file captures with sharedConfigBuild=${sharedConfigBuild}`, async () => {
      const directory = `dist-test/metadata-config-${sharedConfigBuild}`
      onTestFinished(() =>
        rm(resolve(CONFIG_ROOT, directory), { recursive: true, force: true }),
      )
      const builder = await createBuilder({
        root: CONFIG_ROOT,
        builder: { sharedConfigBuild },
        plugins: [
          {
            name: 'test:metadata-config-output',
            enforce: 'post',
            config: () => ({
              environments: {
                client: { build: { outDir: `${directory}/client` } },
                ssr: { build: { outDir: `${directory}/server` } },
              },
            }),
          },
        ],
      })
      const plugin = builder.config.plugins.find(
        plugin => plugin.name === 'foldkit:build',
      )
      for (const environment of Object.values(builder.environments)) {
        expect(
          environment.plugins.find(plugin => plugin.name === 'foldkit:build'),
        ).toBe(plugin)
      }
      await builder.buildApp()
      expect(
        metadataApi(builder).getBuildMetadata().manifest.prerendered,
      ).toEqual(['/'])
    })
  }

  it('invalidates completed metadata while rebuilding and replaces the snapshot', async () => {
    const paths = ['/']
    let isRebuilding = false
    const observed: Array<string> = []
    const fixture = await metadataFixture(
      'rebuild',
      { prerender: { paths } },
      [],
      [
        {
          name: 'test:observe-rebuild',
          buildStart: {
            order: 'post',
            handler() {
              if (isRebuilding) {
                expect(() =>
                  metadataApi(fixture.builder).getBuildMetadata(),
                ).toThrow(METADATA_NOT_READY)
                observed.push(this.environment.name)
              }
            },
          },
        },
      ],
    )
    await fixture.builder.buildApp()
    const previous = metadataApi(fixture.builder).getBuildMetadata()
    paths.push('/about')
    isRebuilding = true
    await fixture.builder.buildApp()
    expect(observed).toEqual(['client', 'ssr'])
    expect(previous.manifest.prerendered).toEqual(['/'])
    expect(
      metadataApi(fixture.builder).getBuildMetadata().manifest.prerendered,
    ).toEqual(['/', '/about'])
  })

  it('invalidates metadata when only the server rebuilds', async () => {
    const fixture = await metadataFixture('server-rebuild')
    await fixture.builder.buildApp()
    const previous = metadataApi(fixture.builder).getBuildMetadata()
    const server = fixture.builder.environments['ssr']

    if (server === undefined) {
      throw new Error('Missing ssr environment')
    }

    await fixture.builder.build(server)
    expect(() => metadataApi(fixture.builder).getBuildMetadata()).toThrow(
      METADATA_NOT_READY,
    )
    expect(previous.manifest.prerendered).toEqual(['/', '/about'])

    await fixture.builder.buildApp()
    expect(
      metadataApi(fixture.builder).getBuildMetadata().manifest.prerendered,
    ).toEqual(['/', '/about'])
  })

  it('discards completed metadata when a rebuild fails', async () => {
    let isFailing = false
    const fixture = await metadataFixture(
      'failure',
      { prerender: true },
      [],
      [
        {
          name: 'test:metadata-failure',
          generateBundle() {
            if (isFailing && this.environment.name === 'client') {
              throw new Error('controlled client failure')
            }
          },
        },
      ],
    )
    await fixture.builder.buildApp()
    expect(
      metadataApi(fixture.builder).getBuildMetadata().manifest.prerendered,
    ).toEqual(['/', '/about'])

    isFailing = true
    await expect(fixture.builder.buildApp()).rejects.toThrow(
      /controlled client failure/,
    )
    expect(() => metadataApi(fixture.builder).getBuildMetadata()).toThrow(
      METADATA_NOT_READY,
    )
  })

  it('cannot reuse captures from another plugin with the same output layout', async () => {
    const first = await metadataFixture('isolated-captures')
    await first.builder.buildApp()
    const second = await metadataFixture(
      'isolated-captures',
      { prerender: true },
      [
        {
          name: 'test:skip-client',
          config: () => ({
            builder: {
              buildApp: async builder => {
                const server = builder.environments['ssr']
                if (server === undefined) {
                  throw new Error('Missing ssr environment')
                }
                await builder.build(server)
              },
            },
          }),
        },
      ],
    )
    await expect(second.builder.buildApp()).rejects.toThrow(
      /has not emitted index\.html/,
    )
    expect(() => metadataApi(second.builder).getBuildMetadata()).toThrow(
      METADATA_NOT_READY,
    )
  })
})
