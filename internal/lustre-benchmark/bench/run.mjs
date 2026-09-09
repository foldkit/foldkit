import { execFileSync } from 'node:child_process'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

import { startServer } from './server.mjs'

/**
 * Drives the lustre-labs/benchmark runbook (add 100 todos, toggle each,
 * destroy the first 100 times) against implementation slots in a harness
 * clone, replicating the harness measurement protocol: instrumentation.js
 * wraps setTimeout, requestAnimationFrame, queueMicrotask, and
 * Promise.prototype.then inside the app iframe, and the reported total is
 * the SUM of time spent executing inside those callbacks plus synchronous
 * event-handler time. Waiting between steps costs nothing. Application boot
 * settles before measurements reset, and the runner uses the harness's
 * one-quiet-frame unload gate after the final step. Implementations are
 * interleaved by round, and the relative result compares their displayed
 * medians from the same batch.
 * The per-bucket split (sync, timeout, rAF, microtask, promise) attributes
 * runtime overhead that a single total hides.
 *
 *   HARNESS_DIR=~/dev/lustre-benchmark pnpm bench:run
 *
 * Environment:
 * - HARNESS_DIR (required): path to a lustre-labs/benchmark clone.
 * - IMPLS: comma-separated slot names under priv/implementations
 *   (default: foldkit-dev,foldkit-dev-optimised).
 * - RUNS: runs per implementation, median reported (default: the smallest
 *   multiple of the implementation count that is at least 5).
 * - PORT: server port (default 8377).
 * - FOLDKIT_BENCH_CHROMIUM: chromium executable path override.
 */

const benchDir = dirname(fileURLToPath(import.meta.url))

const harnessDir = process.env.HARNESS_DIR
if (!harnessDir) {
  console.error(
    'HARNESS_DIR is required: path to a lustre-labs/benchmark clone',
  )
  process.exit(1)
}
const HARNESS_REVISION = (() => {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: harnessDir,
      encoding: 'utf8',
    }).trim()
  } catch {
    return 'unknown'
  }
})()

const port = Number(process.env.PORT ?? 8377)
const baseUrl = `http://localhost:${port}`
const ITEM_COUNT = 100
const IMPLEMENTATIONS = (
  process.env.IMPLS ?? 'foldkit-dev,foldkit-dev-optimised'
)
  .split(',')
  .map(implementation => implementation.trim())
  .filter(Boolean)
if (IMPLEMENTATIONS.length === 0) {
  console.error('IMPLS must contain at least one implementation slot')
  process.exit(1)
}
const MINIMUM_RUN_COUNT = 5
const DEFAULT_RUN_COUNT =
  Math.ceil(MINIMUM_RUN_COUNT / IMPLEMENTATIONS.length) * IMPLEMENTATIONS.length
const runCount = Number(process.env.RUNS ?? DEFAULT_RUN_COUNT)
if (!Number.isInteger(runCount) || runCount < 1) {
  console.error('RUNS must be a positive integer')
  process.exit(1)
}
if (runCount % IMPLEMENTATIONS.length !== 0) {
  console.warn(
    `RUNS=${runCount} does not balance ${IMPLEMENTATIONS.length} implementations across every ordinal position; use a multiple of ${IMPLEMENTATIONS.length}`,
  )
}

const median = numbers => {
  const sorted = [...numbers].sort(
    (firstNumber, secondNumber) => firstNumber - secondNumber,
  )
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

const server = await startServer(harnessDir, benchDir, port)
let browser = null

const summary = {}
const runsByImplementation = Object.fromEntries(
  IMPLEMENTATIONS.map(implementation => [implementation, []]),
)

const implementationOrderFor = round => {
  const offset = round % IMPLEMENTATIONS.length
  return [...IMPLEMENTATIONS.slice(offset), ...IMPLEMENTATIONS.slice(0, offset)]
}

const sumBuckets = results =>
  results.sync +
  results.timeout +
  results.animation_frame +
  results.microtask +
  results.promise

try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.FOLDKIT_BENCH_CHROMIUM,
  })
  console.log(`harness revision: ${HARNESS_REVISION}`)
  console.log(`chromium version: ${browser.version()}`)

  for (let round = 0; round < runCount; round++) {
    for (const implementation of implementationOrderFor(round)) {
      const context = await browser.newContext()
      // The implementations load TodoMVC CSS from unpkg. Styling is
      // irrelevant to the runbook, and a network fetch would add variance
      // and violate COEP, so every implementation gets the same empty
      // stylesheet.
      await context.route(/unpkg\.com|todomvc\.com/, route =>
        route.fulfill({
          status: 200,
          contentType: 'text/css',
          headers: { 'Cross-Origin-Resource-Policy': 'cross-origin' },
          body: '',
        }),
      )
      const page = await context.newPage()
      let maybePageError = null
      page.on('pageerror', error => {
        maybePageError ??= error
        console.error(`[${implementation}] pageerror:`, error.message)
      })
      await page.goto(`${baseUrl}/__runner/runner.html`)
      const result = await page.evaluate(
        ([url, count]) => window.runBenchmark(url, count),
        [
          `${baseUrl}/priv/implementations/${implementation}/dist/index.html`,
          ITEM_COUNT,
        ],
      )
      // A run that threw anywhere or lost timer precision produces numbers
      // that are wrong or incomparable; fail loudly instead of averaging
      // them in.
      if (maybePageError !== null) {
        throw maybePageError
      }
      if (!result.crossOriginIsolated) {
        throw new Error(`${implementation} is not cross-origin isolated`)
      }
      runsByImplementation[implementation].push(result)
      console.log(
        `[round ${round + 1}/${runCount}] ${implementation}: ${result.total.toFixed(1)}ms`,
      )
      await context.close()
    }
  }

  for (const implementation of IMPLEMENTATIONS) {
    const runs = runsByImplementation[implementation]
    const medianOf = pick => Number(median(runs.map(pick)).toFixed(1))
    summary[implementation] = {
      crossOriginIsolated: runs[0].crossOriginIsolated,
      total: medianOf(run => run.total),
      sync: medianOf(run => run.results.sync),
      timeout: medianOf(run => run.results.timeout),
      animationFrame: medianOf(run => run.results.animation_frame),
      microtask: medianOf(run => run.results.microtask),
      promise: medianOf(run => run.results.promise),
      boot: medianOf(run => sumBuckets(run.boot.results)),
      counts: runs[Math.floor(runCount / 2)].counts,
    }
  }

  const fastestMedian = Math.min(
    ...Object.values(summary).map(row => row.total),
  )
  for (const implementation of IMPLEMENTATIONS) {
    const row = summary[implementation]
    row.relativeToFastest = Number((row.total / fastestMedian).toFixed(2))
    console.log(implementation, JSON.stringify(summary[implementation]))
  }
} finally {
  if (browser !== null) {
    await browser.close()
  }
  server.close()
}

console.log('\n=== medians (ms) ===')
const columns = [
  'total',
  'relative',
  'sync',
  'timeout',
  'animationFrame',
  'microtask',
  'promise',
]
console.log(
  'implementation'.padEnd(36),
  ...columns.map(column => column.padStart(10)),
)
for (const [implementation, row] of Object.entries(summary)) {
  const valueFor = column =>
    column === 'relative'
      ? `${row.relativeToFastest.toFixed(2)}x`
      : String(row[column])
  console.log(
    implementation.padEnd(36),
    ...columns.map(column => valueFor(column).padStart(10)),
  )
}
