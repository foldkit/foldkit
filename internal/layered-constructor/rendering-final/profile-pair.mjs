import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

assert(
  process.argv[2],
  'Usage: node profile-pair.mjs FROZEN_BENCHMARK_DIRECTORY [FRESH_OUTPUT_DIRECTORY]',
)
const root = resolve(process.argv[2])
const output = resolve(process.argv[3] ?? join(root, 'profile-pair'))
const { chromium } = await import(
  pathToFileURL(join(root, 'driver/node_modules/playwright/index.mjs')).href
)
const { startServer } = await import(
  pathToFileURL(join(root, 'driver/server.mjs')).href
)
assert(!existsSync(output), 'Refusing to overwrite paired profiles')
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const preparation = JSON.parse(
  readFileSync(join(root, 'preparation.json'), 'utf8'),
)
for (const [name, expected] of Object.entries(preparation.driverFiles)) {
  assert.equal(sha256(readFileSync(join(root, 'driver', name))), expected)
}
assert.equal(
  sha256(readFileSync(join(root, 'harness/priv/instrumentation.js'))),
  preparation.instrumentationSha256,
)
const main = JSON.parse(readFileSync(join(root, 'main-bundles.json'), 'utf8'))
const repaired = JSON.parse(
  readFileSync(join(root, 'repaired-bundles.json'), 'utf8'),
)
const slots = [
  'foldkit-main-a471adb-optimised',
  'foldkit-candidate-repaired-optimised',
]
for (const slot of slots) {
  const facts = { ...main.slots, ...repaired.slots }[slot]
  for (const file of facts.files) {
    assert.equal(
      sha256(
        readFileSync(
          join(root, 'harness/priv/implementations', slot, 'dist', file.file),
        ),
      ),
      file.sha256,
    )
  }
}
mkdirSync(output)
const port = 38379
const baseUrl = `http://localhost:${port}`
const samplingIntervalUs = 100
const startedAt = new Date().toISOString()
const receipt = {
  label:
    'One diagnostic optimized browser CPU profile per slot; not an official timing batch',
  startedAt,
  port,
  itemCount: 100,
  samplingIntervalUs,
  workload:
    'Unchanged driver/runner.html window.runBenchmark; add100, toggle100, delete100',
  span: 'Profile starts before app iframe navigation and stops after unchanged runner resolves; includes boot and idle waits',
  order: slots,
  results: [],
}
writeFileSync(
  join(output, 'receipt.json'),
  JSON.stringify(receipt, null, 2) + '\n',
  { flag: 'wx' },
)
const server = await startServer(
  join(root, 'harness'),
  join(root, 'driver'),
  port,
)
let browser
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.FOLDKIT_BENCH_CHROMIUM,
  })
  receipt.chromiumVersion = browser.version()
  for (const slot of slots) {
    const context = await browser.newContext()
    try {
      await context.route(/unpkg\.com|todomvc\.com/, route =>
        route.fulfill({
          status: 200,
          contentType: 'text/css',
          headers: { 'Cross-Origin-Resource-Policy': 'cross-origin' },
          body: '',
        }),
      )
      const page = await context.newPage()
      let pageError
      page.on('pageerror', error => {
        pageError ??= error
      })
      await page.goto(`${baseUrl}/__runner/runner.html`)
      const session = await context.newCDPSession(page)
      await session.send('Profiler.enable')
      await session.send('Profiler.setSamplingInterval', {
        interval: samplingIntervalUs,
      })
      await session.send('Profiler.start')
      const result = await page.evaluate(
        ([url, count]) => window.runBenchmark(url, count),
        [`${baseUrl}/priv/implementations/${slot}/dist/index.html`, 100],
      )
      const { profile } = await session.send('Profiler.stop')
      await session.send('Profiler.disable')
      await session.detach()
      assert.equal(pageError, undefined)
      assert.equal(result.crossOriginIsolated, true)
      assert.equal(result.counts.sync, 400)
      assert.equal(result.counts.animation_frame, 400)
      const appNodes = profile.nodes.filter(node =>
        node.callFrame.url.includes(
          `/priv/implementations/${slot}/dist/assets/`,
        ),
      )
      assert(
        appNodes.length > 0,
        'CPU profile did not capture the app iframe bundle',
      )
      const bytes = JSON.stringify(profile)
      writeFileSync(join(output, `${slot}.cpuprofile`), bytes, { flag: 'wx' })
      receipt.results.push({
        slot,
        result,
        profileSha256: sha256(bytes),
        profileBytes: Buffer.byteLength(bytes),
        sampleCount: profile.samples?.length,
        nodes: profile.nodes.length,
        appBundleNodes: appNodes.length,
        profileDurationUs: profile.endTime - profile.startTime,
      })
      writeFileSync(
        join(output, 'receipt.json'),
        JSON.stringify(receipt, null, 2) + '\n',
      )
      console.log(
        `${slot}: profile saved, ${profile.samples?.length} samples, ${appNodes.length} app nodes; diagnostic instrumented total ${result.total.toFixed(1)}ms`,
      )
    } finally {
      await context.close()
    }
  }
} finally {
  if (browser) await browser.close()
  await new Promise((resolve, reject) =>
    server.close(error => (error ? reject(error) : resolve())),
  )
  receipt.completedAt = new Date().toISOString()
  receipt.browserAndServerClosed = true
  writeFileSync(
    join(output, 'receipt.json'),
    JSON.stringify(receipt, null, 2) + '\n',
  )
}
console.log('Paired profiles complete; browser and server closed')
