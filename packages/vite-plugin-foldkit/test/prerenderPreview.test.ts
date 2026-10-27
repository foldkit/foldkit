import { Option } from 'effect'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { type InlineConfig, preview } from 'vite'
import { describe, expect, it, onTestFinished } from 'vitest'

import { foldkitSsr } from '../src/ssr.ts'
import { boundPort } from './boundPort.ts'

const startPreview = async (options: InlineConfig = {}) => {
  const root = await mkdtemp(join(tmpdir(), 'foldkit-prerender-preview-'))
  onTestFinished(() => rm(root, { recursive: true, force: true }))
  const outDir =
    options.environments?.['client']?.build?.outDir ??
    options.build?.outDir ??
    'dist'

  const pages = {
    'index.html': '<title>Home</title><main>Home page</main>',
    'about/index.html': '<title>About</title><main>About page</main>',
    'docs/guide/index.html': '<title>Guide</title><main>Guide page</main>',
    'hello world/index.html': '<title>Hello</title><main>Hello page</main>',
    'assets/client.js': 'globalThis.loaded = true',
  }

  for (const [path, content] of Object.entries(pages)) {
    const file = join(root, outDir, path)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, content)
  }

  const server = await preview({
    ...options,
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [foldkitSsr({ serverEntry: '/not-executed-in-preview.ts' })],
    build: { outDir: 'dist', ...options.build },
    preview: { host: '127.0.0.1', port: 0, ...options.preview },
  })
  onTestFinished(() => server.close())

  const port = Option.getOrThrow(boundPort(server.httpServer.address()))
  return { root, origin: `http://127.0.0.1:${port}` }
}

describe('prerendered pages in Vite preview', () => {
  it.each([
    { path: '/about', title: 'About' },
    { path: '/about/', title: 'About' },
    { path: '/about/index.html', title: 'About' },
    { path: '/about?view=details', title: 'About' },
    { path: '/docs/guide', title: 'Guide' },
    { path: '/hello%20world', title: 'Hello' },
  ])('serves the generated document at $path', async ({ path, title }) => {
    const { origin } = await startPreview()
    const response = await fetch(`${origin}${path}`)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(await response.text()).toContain(`<title>${title}</title>`)
  })

  it('serves HEAD and preview headers through Vite', async () => {
    const { origin } = await startPreview({
      preview: { headers: { 'X-Preview-Test': 'retained' } },
    })
    const get = await fetch(`${origin}/about`)
    const head = await fetch(`${origin}/about`, { method: 'HEAD' })

    expect(head.status).toBe(200)
    expect(head.headers.get('content-length')).toBe(
      get.headers.get('content-length'),
    )
    expect(head.headers.get('x-preview-test')).toBe('retained')
    expect(await head.text()).toBe('')
  })

  it('preserves base paths and leaves unprefixed requests to Vite', async () => {
    const { origin } = await startPreview({ base: '/app/' })
    const about = await fetch(`${origin}/app/about?view=details`)
    const outsideBase = await fetch(`${origin}/about`, { redirect: 'manual' })

    expect(about.status).toBe(200)
    expect(await about.text()).toContain('<title>About</title>')
    expect(await outsideBase.text()).not.toContain('<title>About</title>')
  })

  it('uses the client environment output selected by Vite', async () => {
    const { origin } = await startPreview({
      build: { outDir: 'unused-root-output' },
      environments: { client: { build: { outDir: 'generated-client' } } },
    })
    const declaredPath = await fetch(`${origin}/about`)
    const outputPath = await fetch(`${origin}/about/index.html`)

    expect(declaredPath.status).toBe(200)
    expect(await declaredPath.text()).toContain('<title>About</title>')
    expect(await outputPath.text()).toContain('<title>About</title>')
  })

  it('preserves flat HTML precedence, assets and the SPA fallback', async () => {
    const { root, origin } = await startPreview()
    await writeFile(join(root, 'dist/about.html'), '<title>Flat About</title>')

    const flat = await fetch(`${origin}/about`)
    const directory = await fetch(`${origin}/about/`)
    const asset = await fetch(`${origin}/assets/client.js`)
    const unknown = await fetch(`${origin}/unknown`)

    expect(await flat.text()).toContain('<title>Flat About</title>')
    expect(await directory.text()).toContain('<title>About</title>')
    expect(await asset.text()).toBe('globalThis.loaded = true')
    expect(await unknown.text()).toContain('<title>Home</title>')
  })

  it('retains MPA misses and does not turn non-HTML requests into pages', async () => {
    const { origin } = await startPreview({ appType: 'mpa' })
    const about = await fetch(`${origin}/about`)
    const unknown = await fetch(`${origin}/unknown`)
    const json = await fetch(`${origin}/about`, {
      headers: { accept: 'application/json' },
    })
    const post = await fetch(`${origin}/about`, { method: 'POST' })

    expect(await about.text()).toContain('<title>About</title>')
    expect(unknown.status).toBe(404)
    expect(json.status).toBe(404)
    expect(post.status).toBe(404)
  })

  it('preserves the original target for configured proxies', async () => {
    const { origin } = await startPreview({
      preview: {
        proxy: {
          '^/about$': {
            target: 'http://127.0.0.1:1',
            bypass: () => '/index.html',
          },
        },
      },
    })

    const response = await fetch(`${origin}/about`)
    expect(await response.text()).toContain('<title>Home</title>')
  })

  it('leaves custom application routing unchanged', async () => {
    const { origin } = await startPreview({ appType: 'custom' })
    const response = await fetch(`${origin}/about`)

    expect(response.status).toBe(404)
    expect(await response.text()).not.toContain('<title>About</title>')
  })

  it.each([
    '/docs%2fguide',
    '/docs%5cguide',
    '/%zz',
    '//elsewhere.invalid/about',
  ])('does not reinterpret an invalid generation path: %s', async path => {
    const { origin } = await startPreview()
    const response = await fetch(`${origin}${path}`)
    const body = await response.text()

    expect(body).not.toContain('<title>Guide</title>')
    expect(body).not.toContain('<title>About</title>')
  })
})
