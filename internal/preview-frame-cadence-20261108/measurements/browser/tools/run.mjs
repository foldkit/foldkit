import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer as createNetServer } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const fixtureRoot = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(process.argv[2])
const label = process.argv[3]
const port = Number(process.argv[4])
if (
  !/^[a-z0-9-]+$/.test(label) ||
  !Number.isSafeInteger(port) ||
  port < 1024 ||
  port > 65535
) {
  throw new Error('Provide a source root, capture label and loopback port')
}
const captureRoot = join(fixtureRoot, label)
if (existsSync(captureRoot)) throw new Error('Capture directory already exists')
mkdirSync(captureRoot)
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const dependencyRoot =
  '/Users/devinjameson/.codex/worktrees/block-completion-record/foldkit-unified-recovery-20261103'
const require = createRequire(
  join(dependencyRoot, 'internal/lustre-benchmark/package.json'),
)
const { createServer } = await import(pathToFileURL(require.resolve('vite')))
const { chromium } = require('playwright')
const { foldkit } = await import(
  pathToFileURL(
    join(dependencyRoot, 'packages/vite-plugin-foldkit/dist/index.js'),
  )
)
const { foldkitAliases } = await import(
  pathToFileURL(join(sourceRoot, 'examples/vite.aliases.ts'))
)
const assertPortAvailable = () =>
  new Promise((resolve_, reject) => {
    const socket = createNetServer()
    socket.once('error', reject)
    socket.listen(port, '127.0.0.1', () =>
      socket.close(error => (error ? reject(error) : resolve_())),
    )
  })
const metadata = {
  label,
  sourceRoot,
  mode: 'Vite source aliases; functional browser cadence only',
  appSha256: hash(readFileSync(join(fixtureRoot, 'app.ts'))),
  driverSha256: hash(readFileSync(fileURLToPath(import.meta.url))),
  rendererSha256: hash(
    readFileSync(join(sourceRoot, 'packages/foldkit/src/runtime/renderer.ts')),
  ),
  streamSha256: hash(
    readFileSync(
      join(sourceRoot, 'packages/foldkit/src/dom/animationFrameTicks.ts'),
    ),
  ),
  port,
}
let server
let browser
let result
try {
  await assertPortAvailable()
  server = await createServer({
    configFile: false,
    root: fixtureRoot,
    plugins: [foldkit({ devToolsMcpPort: false })],
    resolve: {
      alias: foldkitAliases(join(sourceRoot, 'internal/lustre-benchmark')),
    },
    server: {
      host: '127.0.0.1',
      port,
      strictPort: true,
      fs: { allow: [sourceRoot, dependencyRoot, fixtureRoot] },
    },
  })
  await server.listen()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } })
  const errors = []
  const sourceCaptures = []
  page.on('response', response => {
    if (
      /\/packages\/foldkit\/src\/(runtime\/renderer|dom\/animationFrameTicks)\.ts(?:\?|$)/.test(
        response.url(),
      )
    ) {
      sourceCaptures.push(
        response.text().then(body => ({ url: response.url(), body })),
      )
    }
  })
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame.bind(window)
    const cancel = window.cancelAnimationFrame.bind(window)
    const pending = new Map()
    const probe = {
      values: [],
      callbacks: {},
      lastFrame: 0,
      lastTickFrame: 0,
      pending,
      originalRequest: request,
    }
    window.frameCadenceProbe = probe
    window.requestAnimationFrame = callback => {
      const id = request(time => {
        pending.delete(id)
        probe.lastFrame = time
        probe.callbacks[callback.name] =
          (probe.callbacks[callback.name] ?? 0) + 1
        if (callback.name === 'tick') probe.lastTickFrame = time
        callback(time)
      })
      pending.set(id, callback.name)
      return id
    }
    window.cancelAnimationFrame = id => {
      pending.delete(id)
      cancel(id)
    }
    new MutationObserver(() => {
      const text = document.getElementById('tick-count')?.textContent
      const count = Number(text)
      const previous = probe.values.at(-1)
      if (
        text !== undefined &&
        count > 0 &&
        Number.isSafeInteger(count) &&
        previous?.count !== count
      ) {
        probe.values.push({
          count,
          frame: probe.lastFrame,
          lastTickFrame: probe.lastTickFrame,
        })
      }
    }).observe(document, {
      subtree: true,
      childList: true,
      characterData: true,
    })
  })
  await page.goto(`http://127.0.0.1:${port}/`)
  await page.waitForFunction(
    () => window.frameCadenceProbe?.values.length >= 75,
    undefined,
    { timeout: 20000 },
  )
  const capturedSources = await Promise.all(sourceCaptures)
  const authenticatedSources = capturedSources.map(({ url, body }) => {
    const match = body.match(
      /sourceMappingURL=data:application\/json[^,]*;base64,([A-Za-z0-9+/=]+)/,
    )
    if (!match)
      throw new Error('Served module has no original-source map: ' + url)
    const map = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'))
    const expected = url.includes('/runtime/renderer.ts')
      ? metadata.rendererSha256
      : metadata.streamSha256
    const sourceHashes = map.sourcesContent.map(source => hash(source))
    if (!sourceHashes.includes(expected))
      throw new Error('Served source-map mismatch: ' + url)
    if (
      !decodeURIComponent(new URL(url).pathname).includes(
        sourceRoot + '/packages/foldkit/src/',
      )
    )
      throw new Error('Unexpected source root: ' + url)
    const kind = url.includes('/runtime/renderer.ts') ? 'renderer' : 'stream'
    writeFileSync(join(captureRoot, kind + '-' + hash(body) + '.js'), body)
    return { url, kind, responseSha256: hash(body), sourceHashes }
  })
  for (const kind of ['renderer', 'stream'])
    if (!authenticatedSources.some(source => source.kind === kind))
      throw new Error('No executed ' + kind + ' source was captured')
  const capture = await page.evaluate(() => {
    const { values, callbacks } = window.frameCadenceProbe
    return { values, callbacks }
  })
  await page.evaluate(async () => {
    await window.stopFrameProbe()
    await new Promise(resolve_ =>
      window.frameCadenceProbe.originalRequest(() =>
        window.frameCadenceProbe.originalRequest(resolve_),
      ),
    )
  })
  const pendingAfterDisposal = await page.evaluate(() =>
    Array.from(window.frameCadenceProbe.pending.values()),
  )
  if (errors.length > 0 || pendingAfterDisposal.length > 0)
    throw new Error(JSON.stringify({ errors, pendingAfterDisposal }))
  const steady = capture.values.slice(-60)
  result = {
    ...metadata,
    browserVersion: browser.version(),
    capture,
    authenticatedSources,
    deltas: steady
      .slice(1)
      .map((value, index) => value.count - steady[index].count),
    sameFrameCount: steady.filter(value => value.frame === value.lastTickFrame)
      .length,
    pendingAfterDisposal,
    errors,
  }
  writeFileSync(
    join(captureRoot, 'capture.json'),
    JSON.stringify(result, null, 2) + '\n',
  )
  console.log(
    JSON.stringify({
      label,
      browser: browser.version(),
      callbackNames: capture.callbacks,
      deltaValues: Array.from(new Set(result.deltas)),
      sameFrameCount: result.sameFrameCount,
      observations: steady.length,
    }),
  )
} catch (error) {
  writeFileSync(
    join(captureRoot, 'failure.json'),
    JSON.stringify(
      { ...metadata, error: String(error), stack: error.stack },
      null,
      2,
    ) + '\n',
  )
  throw error
} finally {
  await browser?.close()
  await server?.close()
  if (server) await assertPortAvailable()
}
