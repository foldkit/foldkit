import { Array, Option } from 'effect'
import {
  mkdtemp,
  mkdir,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { type IncomingHttpHeaders, request } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { type InlineConfig, type Plugin, createBuilder, preview } from 'vite'
import { describe, expect, it, onTestFinished } from 'vitest'

import { foldkitBuild } from '../src/build.ts'
import { foldkit } from '../src/index.ts'
import { boundPort } from './boundPort.ts'

const HOME = '<title>Home</title><h1>Home</h1>'
const ABOUT = '<title>About</title><h1>Generated About page</h1>'
const NESTED = '<title>Getting started</title>'
const OUTPUT = 'dist/client'
const files = {
  'index.html': HOME,
  'about/index.html': ABOUT,
  'docs/getting-started/index.html': NESTED,
  'café guide/index.html': 'Unicode route',
  'release.v1/index.html': 'Dotted route',
  'question?mark/index.html': 'Question route',
  'question%3Fmark/index.html': 'Encoded question route',
  'hash#mark/index.html': 'Hash route',
  'indexed/index': 'Extensionless index',
  'indexed/index.html': 'HTML index',
  'flat.html': 'Flat document',
  'flat/index.html': 'Directory document',
  download: 'Exact file',
  'download.html': 'Flat download',
  'asset.js': 'export default 42',
  'style.css': 'body { color: red }',
}

type Response = Readonly<{
  status: number | undefined
  headers: IncomingHttpHeaders
  body: string
}>

const previewPlugins = (
  prerender: boolean | undefined,
  clientOutDir = OUTPUT,
) => {
  const clientEntry = '/entry.client.ts'
  const serverEntry = '/entry.server.ts'
  const build =
    prerender === undefined ? { clientOutDir } : { clientOutDir, prerender }

  return {
    plugin: foldkitBuild(serverEntry, { clientEntry, ...build }),
    composed: foldkit({ ssr: { serverEntry, clientEntry, build } }),
  }
}

const startPreview = async (
  config: InlineConfig = {},
  isBuilt = false,
  clientOutDir = OUTPUT,
) => {
  const root = await mkdtemp(resolve(tmpdir(), 'foldkit-preview-'))
  onTestFinished(() => rm(root, { recursive: true, force: true }))
  const outDir =
    config.environments?.['client']?.build?.outDir ??
    config.build?.outDir ??
    clientOutDir
  for (const [file, text] of Object.entries(files)) {
    const destination = resolve(root, outDir, file)
    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, text)
  }
  if (outDir !== OUTPUT) {
    await mkdir(resolve(root, OUTPUT, 'about'), { recursive: true })
    await writeFile(resolve(root, OUTPUT, 'about/index.html'), 'Decoy')
  }
  const observed: Array<
    Readonly<{ url: string | undefined; originalUrl: string | undefined }>
  > = []
  const observer: Plugin = {
    name: 'observe-preview-request',
    configurePreviewServer(server) {
      server.middlewares.use((request, _response, next) => {
        observed.push({ url: request.url, originalUrl: request.originalUrl })
        next()
      })
    },
  }
  const { plugin, composed } = previewPlugins(true, clientOutDir)

  if (isBuilt) {
    const builder = await createBuilder({
      configFile: false,
      logLevel: 'silent',
      root: resolve(import.meta.dirname, 'fixtures/preview'),
      build: { emptyOutDir: true },
      plugins: [
        foldkitBuild('/entry.server.ts', {
          prerender: true,
          clientEntry: '/../build/entry.client.ts',
          clientOutDir: resolve(root, outDir),
          serverOutDir: resolve(root, 'server'),
        }),
      ],
    })
    await builder.buildApp()
    await rename(resolve(root, 'server'), resolve(root, 'unavailable-server'))
  }
  const server = await preview({
    configFile: false,
    root,
    logLevel: 'silent',
    build: { outDir: OUTPUT },
    ...config,
    plugins: [...(config.plugins ?? (isBuilt ? composed : [plugin])), observer],
    preview: {
      ...config.preview,
      host: '127.0.0.1',
      port: 0,
      strictPort: true,
      headers: { 'x-preview': 'vite' },
    },
  })
  onTestFinished(() => server.close())
  const port = Option.getOrThrow(boundPort(server.httpServer.address()))
  const send = (
    path: string,
    method = 'GET',
    headers: Record<string, string> = { accept: 'text/html' },
  ) =>
    new Promise<Response>((resolveResponse, reject) => {
      const client = request(
        { host: '127.0.0.1', port, path, method, headers },
        response => {
          const chunks: Array<Buffer> = []
          response.on('data', chunk => chunks.push(chunk))
          response.on('end', () =>
            resolveResponse({
              status: response.statusCode,
              headers: response.headers,
              body: Buffer.concat(chunks).toString(),
            }),
          )
        },
      )
      client.on('error', reject)
      client.end()
    })
  return { root, outDir, observed, send, server }
}

describe('prerendered preview directory indexes', () => {
  it.each([
    ['/about', ABOUT],
    ['/about?source=probe', ABOUT],
    ['/docs/getting-started', NESTED],
    ['/docs/getting-started?source=probe', NESTED],
    ['/caf%C3%A9%20guide', 'Unicode route'],
    ['/release.v1', 'Dotted route'],
  ])(
    'serves the initial document at %s without a redirect',
    async (path, expected) => {
      const { send, observed } = await startPreview()
      const response = await send(path)
      expect(response.status).toBe(200)
      expect(response.body).toBe(expected)
      expect(response.headers.location).toBeUndefined()
      expect(Array.last(observed)).toEqual(
        Option.some({
          url: path.replace(/(\?|$)/, '/index.html$1'),
          originalUrl: path,
        }),
      )
    },
  )

  it.each([
    ['/about', '/about?source=probe'],
    ['^/about\\?source=probe$', '/about?source=probe'],
    ['/about/index', HOME],
    ['^/about/index\\.html\\?source=probe$', HOME],
    ['/about', ABOUT, false],
    ['/about/index', ABOUT, false],
  ])(
    'preserves proxy matching for %s',
    async (context, expected, isEnabled = true) => {
      const { send } = await startPreview({
        preview: {
          proxy: {
            [context]: isEnabled
              ? {
                  bypass(request, response) {
                    response?.end(request.url)
                    return '/'
                  },
                }
              : '',
          },
        },
      })
      expect((await send('/about?source=probe')).body).toBe(expected)
    },
  )

  it.each(['standalone', 'aggregate'])(
    'leaves custom application routing to its host with the %s plugin',
    async kind => {
      const { plugin, composed } = previewPlugins(true)
      const { send } = await startPreview({
        appType: 'custom',
        plugins: kind === 'standalone' ? [plugin] : composed,
      })

      const response = await send('/about')
      expect(response.status).toBe(404)
      expect(response.body).not.toContain(ABOUT)
      expect((await send('/about/index.html')).body).toBe(ABOUT)
    },
  )

  it('preserves the original target for a custom host registered after Foldkit', async () => {
    const host: Plugin = {
      name: 'custom-preview-host',
      configurePreviewServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url === '/about?view=custom') {
            response.setHeader('x-preview-owner', 'custom')
            response.end(request.url)
          } else {
            next()
          }
        })
      },
    }
    const { composed } = previewPlugins(true)
    const { send } = await startPreview({
      appType: 'custom',
      plugins: [...composed, host],
    })

    const response = await send('/about?view=custom')
    expect(response.status).toBe(200)
    expect(response.headers['x-preview-owner']).toBe('custom')
    expect(response.body).toBe('/about?view=custom')
  })

  it('selects the same document for HEAD and GET', async () => {
    const { send } = await startPreview()
    const head = await send('/about', 'HEAD')
    const get = await send('/about')
    expect(head.status).toBe(200)
    expect(get.body).toBe(ABOUT)
    expect(head.body).toBe('')
    expect(head.headers['content-type']).toContain('text/html')
    expect(head.headers['content-length']).toBe(
      String(Buffer.byteLength(ABOUT)),
    )
    expect(head.headers['content-length']).toBe(get.headers['content-length'])
  })

  it.each([undefined, '', '*/*'])(
    'accepts HTML navigation with Accept %s',
    async accept => {
      const { send } = await startPreview()
      const headers = accept === undefined ? {} : { accept }
      const response = await send('/docs/getting-started', 'GET', headers)
      expect(response.body).toBe(NESTED)
    },
  )

  it.each(['/app/', 'https://example.test/app/'])(
    'respects base %s and its mount boundary',
    async base => {
      const { send, observed } = await startPreview({ base })
      const path = '/app/about?source=probe'
      expect((await send(path)).body).toBe(ABOUT)
      expect(Array.last(observed)).toEqual(
        Option.some({
          url: '/app/about/index.html?source=probe',
          originalUrl: path,
        }),
      )
      for (const outside of ['/application/about', '/about', '/app']) {
        await send(outside)
        expect(Option.getOrThrow(Array.last(observed)).url).toBe(outside)
      }
    },
  )

  it.each(['relative', 'absolute', 'client environment'])(
    'uses the resolved %s output instead of the default',
    async kind => {
      const absolute = await mkdtemp(
        resolve(tmpdir(), 'foldkit-preview-output-'),
      )
      onTestFinished(() => rm(absolute, { recursive: true, force: true }))
      const outDir = kind === 'absolute' ? absolute : 'custom/client'
      const config =
        kind === 'client environment'
          ? { environments: { client: { build: { outDir } } } }
          : { build: { outDir } }
      const { send, server } = await startPreview(config)
      expect(server.config.environments['client']?.build.outDir).toBe(outDir)
      expect((await send('/about')).body).toBe(ABOUT)
    },
  )

  it('uses clientOutDir from the Foldkit build options when Vite has no output override', async () => {
    const outDir = 'configured/client'
    const { send, server } = await startPreview({ build: {} }, false, outDir)

    expect(server.config.environments['client']?.build.outDir).toBe(outDir)
    expect((await send('/about')).body).toBe(ABOUT)
  })

  it('uses a client output supplied by a later host plugin', async () => {
    const outDir = 'host/client'
    const { plugin } = previewPlugins(true)
    const host: Plugin = {
      name: 'host-preview-output',
      config: () => ({
        environments: { client: { build: { outDir } } },
      }),
    }
    const { send, server } = await startPreview(
      { build: {}, plugins: [plugin, host] },
      false,
      outDir,
    )

    expect(server.config.environments['client']?.build.outDir).toBe(outDir)
    expect((await send('/about')).body).toBe(ABOUT)
  })

  it('preserves generated controls, files, headers and cache validators', async () => {
    const { send } = await startPreview()
    for (const [path, text] of Object.entries({
      '/': HOME,
      '/about/': ABOUT,
      '/about/index.html': ABOUT,
      '/indexed': 'Extensionless index',
      '/flat': 'Flat document',
      '/download': 'Exact file',
      '/asset.js': files['asset.js'],
      '/style.css': files['style.css'],
    })) {
      for (const query of ['', '?source=probe']) {
        expect((await send(`${path}${query}`)).body).toBe(text)
      }
    }
    const response = await send('/about')
    expect(response.headers['x-preview']).toBe('vite')
    expect(response.headers.etag).toBeDefined()
    const conditional = await send('/about', 'GET', {
      accept: 'text/html',
      'if-none-match': response.headers.etag ?? '',
    })
    expect(conditional.status).toBe(304)
  })

  it.each(['spa', 'mpa'])(
    'preserves %s misses and non-navigation requests',
    async appType => {
      const { send, observed } = await startPreview({
        appType: appType === 'spa' ? 'spa' : 'mpa',
      })
      const response = await send('/missing')
      expect(response.status).toBe(appType === 'spa' ? 200 : 404)
      if (appType === 'spa') {
        expect(response.body).toBe(HOME)
      }
      for (const { method, accept } of [
        { method: 'POST', accept: 'text/html' },
        { method: 'OPTIONS', accept: 'text/html' },
        { method: 'GET', accept: 'application/json' },
      ]) {
        await send('/about', method, { accept })
        expect(Option.getOrThrow(Array.last(observed)).url).toBe('/about')
      }
    },
  )

  it.each([undefined, false])(
    'installs no preview hook for prerender %s',
    async prerender => {
      const { plugin, composed } = previewPlugins(prerender)
      expect(plugin.configurePreviewServer).toBeUndefined()
      expect(composed.every(plugin => !plugin.configurePreviewServer)).toBe(
        true,
      )
      for (const plugins of [[], [plugin], composed, foldkit()]) {
        const { send, observed } = await startPreview({ plugins })
        expect((await send('/about')).body).toBe(HOME)
        expect(Option.getOrThrow(Array.last(observed)).url).toBe('/about')
      }
    },
  )

  it('previews built documents without executing or requiring the server output', async () => {
    const { send, root, outDir } = await startPreview({}, true)
    const executions = resolve(root, 'unavailable-server/executions.txt')
    expect(await readFile(executions, 'utf8')).toBe('executed\n')
    expect((await send('/about')).body).toBe(
      await readFile(resolve(root, outDir, 'about/index.html'), 'utf8'),
    )
    expect(await readFile(executions, 'utf8')).toBe('executed\n')
  })

  it('passes malformed and escaping targets unchanged and handles a later valid request', async () => {
    const { root, outDir, send, observed } = await startPreview()
    const sibling = resolve(root, `${outDir}-outside`)
    await mkdir(sibling, { recursive: true })
    await writeFile(resolve(sibling, 'index.html'), 'Outside sentinel')
    await symlink(sibling, resolve(root, outDir, 'escape'))
    await symlink(sibling, resolve(root, outDir, 'hash%23mark'))
    for (const path of [
      '/%',
      '/%ZZ',
      '/about%2fchild',
      '/about%5cchild',
      '/%00',
      '/./about',
      '/../client-outside',
      '/%2e%2e/client-outside',
      '/C:/about',
      '/C%3a/about',
      '//about',
      'http://example.test/about',
      '/escape',
      '/question%3Fmark',
      '/hash%23mark',
      '/about/../../client-outside',
    ]) {
      const response = await send(path)
      expect.soft(response.body).not.toContain('Outside sentinel')
      expect.soft(Option.getOrThrow(Array.last(observed)).url).toBe(path)
    }
    expect((await send('/about')).body).toBe(ABOUT)
  })
})
