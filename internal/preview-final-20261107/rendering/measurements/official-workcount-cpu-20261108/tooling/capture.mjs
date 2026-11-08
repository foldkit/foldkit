import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const EXPECTED_NODE_SHA256 =
  '533bd644c5ae0e0ea3a80e433aad16b817447ccba1e1eea701875eac80cb75d4'
const EXPECTED_CHROMIUM_SHA256 =
  '8319963f6625accf51c0dd4f55091ceaf9f09ed39e7a52fed4fae12b2a6b668a'
const EXPECTED_ARTIFACT_RECEIPT_SHA256 =
  '9e4713466acc76e4f063e257212f209bf8533828c92c36f6eab8cd49a9c2bbde'
const DEFAULT_ROOT =
  '/private/tmp/foldkit-record-release-rendering-xpwmm820'
const DEFAULT_SLOTS = [
  'foldkit-main-optimised',
  'foldkit-preview-final-optimised',
  'foldkit-main',
  'foldkit-preview-final',
]
const ITEM_COUNT = 100
const SAMPLING_INTERVAL_US = 100

const [mode, outputArgument] = process.argv.slice(2)
assert(
  mode === 'coverage' || mode === 'cpu',
  'Usage: exact-node capture.mjs coverage|cpu FRESH_OUTPUT_DIRECTORY',
)
assert(outputArgument, 'A fresh output directory is required')

const root = resolve(process.env.FROZEN_BENCHMARK_ROOT ?? DEFAULT_ROOT)
const output = resolve(outputArgument)
assert(!existsSync(output), `Refusing to overwrite ${output}`)
mkdirSync(output)

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const json = path => JSON.parse(readFileSync(path, 'utf8'))
const writeReceipt = receipt =>
  writeFileSync(
    join(output, 'receipt.json'),
    `${JSON.stringify(receipt, null, 2)}\n`,
  )

assert.equal(sha256(readFileSync(process.execPath)), EXPECTED_NODE_SHA256)

const artifactReceiptPath = join(root, 'final-artifact-receipt.json')
const artifactReceiptBytes = readFileSync(artifactReceiptPath)
assert.equal(sha256(artifactReceiptBytes), EXPECTED_ARTIFACT_RECEIPT_SHA256)
const artifacts = JSON.parse(artifactReceiptBytes)
const preparation = json(join(root, 'preparation.json'))

for (const [file, expected] of Object.entries(preparation.driver)) {
  assert.equal(sha256(readFileSync(join(root, 'driver', file))), expected)
}

const slots = (process.env.CAPTURE_ORDER ?? DEFAULT_SLOTS.join(','))
  .split(',')
  .map(slot => slot.trim())
  .filter(Boolean)
assert.deepEqual([...slots].sort(), [...DEFAULT_SLOTS].sort())

const assetFor = new Map()
for (const slot of slots) {
  const facts = artifacts.slots[slot]
  assert(facts, `Missing retained slot ${slot}`)
  assert(
    [
      'main-optimized',
      'candidate-optimized',
      'main-naive',
      'candidate-naive',
    ].includes(facts.role),
    `Unexpected role for ${slot}: ${facts.role}`,
  )
  for (const file of facts.files) {
    const path = join(
      root,
      'harness/priv/implementations',
      slot,
      'dist',
      file.file,
    )
    const bytes = readFileSync(path)
    assert.equal(bytes.length, file.bytes)
    assert.equal(sha256(bytes), file.sha256)
    if (file.file.endsWith('.js')) {
      assert(!assetFor.has(slot), `Multiple JavaScript assets for ${slot}`)
      assetFor.set(slot, file)
    }
  }
  assert(assetFor.has(slot), `Missing JavaScript asset for ${slot}`)
}

const { chromium } = await import(
  pathToFileURL(join(root, 'driver/node_modules/playwright/index.mjs')).href
)
const { startServer } = await import(
  pathToFileURL(join(root, 'driver/server.mjs')).href
)
const chromiumPath =
  process.env.FOLDKIT_BENCH_CHROMIUM ?? chromium.executablePath()
assert.equal(sha256(readFileSync(chromiumPath)), EXPECTED_CHROMIUM_SHA256)

const port = Number(process.env.PORT ?? (mode === 'coverage' ? 38471 : 38472))
assert(Number.isInteger(port) && port > 0 && port < 65536)
const baseUrl = `http://localhost:${port}`
const receipt = {
  schemaVersion: 1,
  status: 'running',
  mode,
  startedAt: new Date().toISOString(),
  root,
  output,
  artifactReceipt: {
    path: artifactReceiptPath,
    sha256: EXPECTED_ARTIFACT_RECEIPT_SHA256,
    publishedCommit: '54f8bcd443b4fd18952403a3d02e212abf872d58',
    actualMainCommit: artifacts.mainCommit,
  },
  node: {
    executable: process.execPath,
    version: process.version,
    sha256: EXPECTED_NODE_SHA256,
  },
  chromium: {
    executable: chromiumPath,
    sha256: EXPECTED_CHROMIUM_SHA256,
  },
  port,
  itemCount: ITEM_COUNT,
  samplingIntervalUs: mode === 'cpu' ? SAMPLING_INTERVAL_US : undefined,
  slots,
  span:
    'CDP capture starts before window.runBenchmark loads the app iframe and ends after the unchanged runner resolves; it is boot-inclusive. The runner timing buckets reset after boot, but CDP capture does not.',
  workload:
    'Unchanged retained runner: add 100, toggle 100, delete 100; two requestAnimationFrame waits after each logical action and final quiet-frame gate.',
  interpretation:
    mode === 'coverage'
      ? 'Exact call-count diagnostic only. Precise coverage changes optimization and elapsed cadence; its timing values are invalid.'
      : 'Ordinary sampled CPU diagnostic without precise coverage. It is not an official callback-time observation.',
  results: [],
}
writeReceipt(receipt)

const server = await startServer(
  join(root, 'harness'),
  join(root, 'driver'),
  port,
)
let browser
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: chromiumPath,
  })
  receipt.chromium.version = browser.version()

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

      const asset = assetFor.get(slot)
      const assetUrl = `${baseUrl}/priv/implementations/${slot}/dist/${asset.file}`
      const servedResponse = await context.request.get(assetUrl)
      assert.equal(servedResponse.status(), 200)
      const servedBytes = await servedResponse.body()
      assert.equal(servedBytes.length, asset.bytes)
      assert.equal(sha256(servedBytes), asset.sha256)

      const session = await context.newCDPSession(page)
      const scriptIds = new Map()
      session.on('Debugger.scriptParsed', event => {
        scriptIds.set(event.url, event.scriptId)
      })
      await session.send('Debugger.enable')

      if (mode === 'coverage') {
        await session.send('Profiler.enable')
        await session.send('Profiler.startPreciseCoverage', {
          callCount: true,
          detailed: true,
          allowTriggeredUpdates: false,
        })
      } else {
        await session.send('Profiler.enable')
        await session.send('Profiler.setSamplingInterval', {
          interval: SAMPLING_INTERVAL_US,
        })
        await session.send('Profiler.start')
      }

      const result = await page.evaluate(
        ([url, count]) => window.runBenchmark(url, count),
        [
          `${baseUrl}/priv/implementations/${slot}/dist/index.html`,
          ITEM_COUNT,
        ],
      )

      let capture
      if (mode === 'coverage') {
        const taken = await session.send('Profiler.takePreciseCoverage')
        await session.send('Profiler.stopPreciseCoverage')
        capture = taken.result.filter(entry => entry.url === assetUrl)
        assert.equal(capture.length, 1, `Expected one coverage script for ${assetUrl}`)
      } else {
        const stopped = await session.send('Profiler.stop')
        capture = stopped.profile
        const appNodes = capture.nodes.filter(node => node.callFrame.url === assetUrl)
        assert(appNodes.length > 0, `No CPU nodes for ${assetUrl}`)
      }

      const scriptId = scriptIds.get(assetUrl)
      assert(scriptId, `Debugger did not observe ${assetUrl}`)
      const { scriptSource } = await session.send('Debugger.getScriptSource', {
        scriptId,
      })
      assert.equal(Buffer.byteLength(scriptSource), asset.bytes)
      assert.equal(sha256(scriptSource), asset.sha256)

      await session.send('Profiler.disable')
      await session.send('Debugger.disable')
      await session.detach()

      assert.equal(pageError, undefined)
      assert.equal(result.crossOriginIsolated, true)
      assert.deepEqual(result.counts, {
        sync: 400,
        timeout: 0,
        animation_frame: 400,
        microtask: 0,
        promise: 0,
      })
      const finalDom = await page.evaluate(() => {
        const document_ = document.querySelector('#benchmark')?.contentDocument
        return {
          hasNewTodo: Boolean(document_?.querySelector('.new-todo')),
          todoCount: document_?.querySelectorAll('.todo-list > li').length,
        }
      })
      assert.deepEqual(finalDom, { hasNewTodo: true, todoCount: 0 })

      const captureBytes = Buffer.from(JSON.stringify(capture))
      const captureFile = `${slot}.${mode === 'cpu' ? 'cpuprofile' : 'coverage.json'}`
      writeFileSync(join(output, captureFile), captureBytes, { flag: 'wx' })
      receipt.results.push({
        slot,
        role: artifacts.slots[slot].role,
        asset: {
          file: asset.file,
          url: assetUrl,
          bytes: asset.bytes,
          sha256: asset.sha256,
          servedSha256: sha256(servedBytes),
          executedSha256: sha256(scriptSource),
        },
        result,
        finalDom,
        captureFile,
        captureBytes: captureBytes.length,
        captureSha256: sha256(captureBytes),
        functionCount:
          mode === 'coverage' ? capture[0].functions.length : undefined,
        sampleCount:
          mode === 'cpu' ? capture.samples?.length : undefined,
        profileDurationUs:
          mode === 'cpu' ? capture.endTime - capture.startTime : undefined,
      })
      writeReceipt(receipt)
      console.log(
        `${slot}: ${mode} captured from ${basename(asset.file)}; ${result.counts.sync} sync / ${result.counts.animation_frame} rAF`,
      )
    } finally {
      await context.close()
    }
  }
  receipt.status = 'complete'
} catch (error) {
  receipt.status = 'failed'
  receipt.failure = error instanceof Error ? error.stack : String(error)
  throw error
} finally {
  if (browser) {
    await browser.close()
  }
  await new Promise((resolve_, reject) =>
    server.close(error => (error ? reject(error) : resolve_())),
  )
  receipt.completedAt = new Date().toISOString()
  receipt.browserAndServerClosed = true
  receipt.portClosedByOwnedServer = true
  writeReceipt(receipt)
}

console.log(`${mode} capture complete; browser and server closed`)
