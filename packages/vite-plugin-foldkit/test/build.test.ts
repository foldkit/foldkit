import { Schema } from 'effect'
import { execFile } from 'node:child_process'
import { readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { win32 } from 'node:path'
import { promisify } from 'node:util'
import { type Plugin, createBuilder } from 'vite'
import { afterAll, describe, expect, it, onTestFinished } from 'vitest'

import {
  type FoldkitBuildOptions,
  foldkitBuild,
  manifestPath,
  renderTargetFor,
} from '../src/build.ts'
import { foldkitBuildToken } from '../src/buildToken.ts'
import { FoldkitBuildManifest } from '../src/index.ts'

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
      foldkitBuildToken('test-build'),
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
    expect(await filesUnder(client)).toContain('index.html')

    const { pathToFileURL } = await import('node:url')
    const built = await import(pathToFileURL(resolve(server, 'fetch.js')).href)
    expect(typeof built.default.fetch).toBe('function')
    expect(typeof built.renderPage).toBe('function')
    expect(built.origin).toBeUndefined()
  })

  it('accepts a platform Request.url when the build named no origin', async () => {
    const { server } = await buildFixture('platform-origin')
    const { pathToFileURL } = await import('node:url')
    const built = await import(pathToFileURL(resolve(server, 'fetch.js')).href)
    const response = await built.default.fetch(
      new Request('https://app.example/about'),
    )
    expect(response.status).toBe(200)
  })

  it('bakes the browser build template, not the source HTML', async () => {
    const { server } = await buildFixture('fetch-template')
    const bundle = await readFile(resolve(server, 'fetch.js'), 'utf8')
    expect(bundle).not.toContain('./entry.client.ts')
    expect(bundle).toContain('assets/')
  })

  it('serves against ORIGIN from the environment', async () => {
    const { server } = await buildFixture('origin-env')
    const previous = process.env['ORIGIN']
    process.env['ORIGIN'] = 'http://app.example'
    try {
      const { pathToFileURL } = await import('node:url')
      const built = await import(
        `${pathToFileURL(resolve(server, 'fetch.js')).href}?origin-env`
      )
      const allowed = await built.default.fetch(
        new Request('http://app.example/about'),
      )
      expect(allowed.status).toBe(200)
      const refused = await built.default.fetch(
        new Request('http://localhost/about'),
      )
      expect(refused.status).toBe(400)
    } finally {
      if (previous === undefined) {
        delete process.env['ORIGIN']
      } else {
        process.env['ORIGIN'] = previous
      }
    }
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

  // The generated `/` replaces the browser build's own `index.html`, so a build
  // that read its template from that file would parse a page it generated on
  // any second pass over one browser build. The template comes from the build
  // result instead, which this pins by making the file on disk say something
  // the build result does not: generation that reads the file produces pages
  // carrying the corruption, generation that reads the build produces the
  // pages below.
  it('takes the template from the build rather than from the file it writes', async () => {
    const clientDir = 'dist-test/disk-template/client'
    const corruptClientIndex: Plugin = {
      name: 'test:corrupt-client-index',
      // Both environment builds finish before pages are generated, so this
      // needs no environment guard: whenever it runs, the file on disk is
      // corrupt before generation reads anything.
      //
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
    expect(await readFile(resolve(client, 'index.html'), 'utf8')).toContain(
      '<div id="root"></div>',
    )
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
    expect(manifest.host).toBe('fetch')
    expect(manifest.client).toContain('client')
    expect(manifest.server).toContain('server')
  })

  it('reports no generated paths when the build generates none', async () => {
    const { server } = await buildFixture('manifest-none')

    const manifest: FoldkitBuildManifest = JSON.parse(
      await readFile(resolve(server, 'foldkit.build.json'), 'utf8'),
    )

    expect(manifest.prerendered).toEqual([])
    expect(manifest.serverEntry).toBe('fetch.js')
    expect(manifest.host).toBe('fetch')
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

  // `ssr.build` without prerendering is documented as generating no pages, so
  // a client that emits no HTML entry is a build this has no opinion about.
  it('builds without an HTML entry when it generates no pages', async () => {
    const jsOnlyClient: Plugin = {
      name: 'test:js-only-client',
      config: () => ({
        environments: {
          client: {
            build: { rollupOptions: { input: { app: '/entry.client.ts' } } },
          },
        },
      }),
    }

    const { server } = await buildFixture('js-client', {}, [jsOnlyClient])

    expect(await filesUnder(server)).toContain('fetch.js')
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
              rollupOptions: {
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
const VITE_BIN = resolve(import.meta.dirname, '../node_modules/.bin/vite')
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/

// Vite evaluates a config file once per environment it builds, so a config that
// answers with a fresh id each time compiles one id into the browser bundle and
// another into the server bundle, and hydration then refuses every page of the
// deployment that just shipped. Only a real `vite build` reproduces that: an
// in-process builder evaluates the config once, whatever the environments do.
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
