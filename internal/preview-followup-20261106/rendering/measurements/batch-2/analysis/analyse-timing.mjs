import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const [artifactPath, executionPath, preflightPath, outputPath] =
  process.argv.slice(2)

assert(
  artifactPath && executionPath && preflightPath && outputPath,
  'Usage: node analyse-timing.mjs ARTIFACTS EXECUTION PREFLIGHTS OUTPUT',
)

const readJson = path => JSON.parse(readFileSync(path, 'utf8'))
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const artifacts = readJson(artifactPath)
const execution = readJson(executionPath)
const preflights = readJson(preflightPath)
const base = dirname(resolve(artifactPath))
const evidencePath = (...parts) => resolve(base, ...parts)
const fileBytes = file => readFileSync(evidencePath(file))
const checkFile = ({ file, sha256 }) => {
  const bytes = fileBytes(file)
  assert.equal(sha(bytes), sha256, `Changed evidence file: ${file}`)
  return bytes
}
const inventoryDigest = files =>
  sha(
    [...files]
      .sort((left, right) => (left.file < right.file ? -1 : 1))
      .map(({ file, sha256 }) => `${file}\0${sha256}\n`)
      .join(''),
  )
const checkInventory = (root, files, digest) => {
  assert(files.length > 0)
  assert.equal(new Set(files.map(entry => entry.file)).size, files.length)
  assert.equal(inventoryDigest(files), digest, `Changed inventory: ${root}`)
  for (const { file, sha256 } of files) {
    assert.equal(sha(fileBytes(evidencePath(root, file))), sha256, file)
  }
}
const timestamp = value => {
  const parsed = Date.parse(value)
  assert(Number.isFinite(parsed), `Invalid timestamp: ${value}`)
  return parsed
}
const median = values => {
  assert.equal(values.length, 8)
  const sorted = [...values].sort((left, right) => left - right)
  const [, , , lower, upper] = sorted
  return (lower + upper) / 2
}
const percent = (before, after) =>
  Number((100 * (after / before - 1)).toFixed(2))

assert.equal(artifacts.schemaVersion, 1)
assert(['measured', 'synthetic-control'].includes(artifacts.evidenceKind))
assert.equal(artifacts.candidateCommit, artifacts.sourceHead)
for (const commit of [artifacts.candidateCommit, artifacts.mainCommit]) {
  assert.match(commit, /^[a-f0-9]{40}$/)
}
assert.equal(execution.status, 'complete')
assert.equal(execution.exitCode, 0)
assert.equal(execution.artifactReceiptSha256, sha(readFileSync(artifactPath)))
assert.equal(execution.preflightResultsSha256, sha(readFileSync(preflightPath)))
assert.equal(execution.env.RUNS, '8')
assert.equal(execution.benchmarkPortClosedAfterRun, true)
assert.equal(execution.timingIsolation.buildsAndTestsQuiet, true)
assert.equal(execution.timingIsolation.otherBrowserChecksQuiet, true)
const startedAt = timestamp(execution.startedAt)
assert(timestamp(execution.completedAt) > startedAt)
assert(timestamp(artifacts.frozenAt) <= startedAt)

checkInventory(
  artifacts.sourceRoot,
  artifacts.sourceInputs,
  artifacts.sourceInputsSha256,
)
checkInventory(
  artifacts.harnessRoot,
  artifacts.harnessFiles,
  artifacts.harnessFilesSha256,
)
const preparation = JSON.parse(checkFile(artifacts.preparation))
assert.equal(preparation.userHarnessUnmodified, true)
assert.match(preparation.harnessRevision, /^[a-f0-9]{40}$/)
for (const [file, hash] of Object.entries(preparation.driver)) {
  assert.equal(
    sha(fileBytes(evidencePath(artifacts.driverRoot, file))),
    hash,
    file,
  )
}
for (const file of ['run.mjs', 'runner.html', 'verify.mjs', 'server.mjs']) {
  assert(preparation.driver[file], `Missing driver hash: ${file}`)
}
assert(
  artifacts.harnessFiles.some(
    entry => entry.file === 'priv/instrumentation.js',
  ),
)
assert.equal(
  realpathSync(evidencePath(execution.driver)),
  realpathSync(evidencePath(artifacts.driverRoot, 'run.mjs')),
  'Unexpected physical benchmark driver',
)
assert.equal(
  realpathSync(evidencePath(execution.env.HARNESS_DIR)),
  realpathSync(evidencePath(artifacts.harnessRoot)),
  'Unexpected physical harness',
)
assert(artifacts.artifactChecks.length > 0)
assert.equal(
  new Set(artifacts.artifactChecks.map(component => component.component)).size,
  artifacts.artifactChecks.length,
)
for (const component of ['foldkit', 'vite-plugin-foldkit']) {
  assert(artifacts.artifactChecks.some(entry => entry.component === component))
}
for (const component of artifacts.artifactChecks) {
  checkInventory(component.canonicalRoot, component.files, component.sha256)
  checkInventory(component.frozenRoot, component.files, component.sha256)
}

const roles = [
  'main-naive',
  'candidate-naive',
  'main-optimized',
  'candidate-optimized',
]
const slots = execution.env.IMPLS.split(',')
assert.equal(slots.length, 4)
assert.equal(new Set(slots).size, 4)
assert.deepEqual(Object.keys(artifacts.slots).sort(), [...slots].sort())
assert.deepEqual(
  slots.map(slot => artifacts.slots[slot].role),
  roles,
)
const bundles = {}
for (const slot of slots) {
  const files = artifacts.slots[slot].files
  assert(files.length > 0)
  assert.equal(new Set(files.map(entry => entry.file)).size, files.length)
  for (const file of files) {
    const bytes = fileBytes(
      evidencePath(
        artifacts.harnessRoot,
        'priv/implementations',
        slot,
        'dist',
        file.file,
      ),
    )
    assert.equal(sha(bytes), file.sha256, `Changed ${slot}/${file.file}`)
    assert.equal(bytes.length, file.bytes, `${slot} raw bytes`)
    assert.equal(gzipSync(bytes).length, file.gzipBytes, `${slot} gzip bytes`)
  }
  const scripts = files.filter(entry => /\.m?js$/.test(entry.file))
  assert(scripts.length > 0, `No JavaScript bundle in ${slot}`)
  bundles[slot] = {
    files: scripts,
    rawBytes: scripts.reduce((sum, file) => sum + file.bytes, 0),
    gzipBytes: scripts.reduce((sum, file) => sum + file.gzipBytes, 0),
  }
}

assert.equal(preflights.length, 4)
assert.deepEqual(
  preflights.map(result => result.slot).sort(),
  [...slots].sort(),
)
for (const result of preflights) {
  assert.equal(result.exitCode, 0, `Preflight failed: ${result.slot}`)
  assert.equal(result.artifactReceiptSha256, execution.artifactReceiptSha256)
  assert(timestamp(result.startedAt) >= timestamp(artifacts.frozenAt))
  assert(timestamp(result.completedAt) >= timestamp(result.startedAt))
  assert(timestamp(result.completedAt) <= startedAt)
  const bytes = readFileSync(resolve(dirname(preflightPath), result.log))
  assert.equal(sha(bytes), result.logSha256)
  assert(bytes.toString().split('\n').includes(`VERIFY ${result.slot}: OK`))
}
checkFile(execution.hostBefore)
checkFile(execution.hostAfter)

const logBytes = fileBytes(execution.log)
assert.equal(sha(logBytes), execution.logSha256)
const log = logBytes.toString()
const revisionMatch = /^harness revision: (.+)$/m.exec(log)
const chromiumMatch = /^chromium version: (.+)$/m.exec(log)
assert(revisionMatch && chromiumMatch)
const [, revision] = revisionMatch
const [, chromium] = chromiumMatch
assert(revision === 'unknown' || revision === preparation.harnessRevision)
assert(!/pageerror:/i.test(log), 'Driver reported a page error')
const samples = [
  ...log.matchAll(/^\[round (\d+)\/8\] ([^:]+): ([\d.]+)ms$/gm),
].map(([, round, slot, milliseconds]) => ({
  round: Number(round),
  slot,
  totalMs: Number(milliseconds),
}))
assert.equal(samples.length, 32, 'Expected 32 timing samples')
assert.equal(
  log.split('\n').filter(line => line.startsWith('[round ')).length,
  32,
)
for (let round = 1; round <= 8; round++) {
  const offset = (round - 1) % 4
  assert.deepEqual(
    samples
      .slice((round - 1) * 4, round * 4)
      .map(sample => [sample.round, sample.slot]),
    [...slots.slice(offset), ...slots.slice(0, offset)].map(slot => [
      round,
      slot,
    ]),
    `Invalid cyclic order in round ${round}`,
  )
}
assert(
  samples.every(
    sample => Number.isFinite(sample.totalMs) && sample.totalMs > 0,
  ),
)
const reportedMedians = {}
for (const slot of slots) {
  const summaries = log.split('\n').filter(line => line.startsWith(`${slot} {`))
  assert.equal(summaries.length, 1)
  const [summary] = summaries
  const row = JSON.parse(summary.slice(slot.length + 1))
  assert.equal(row.crossOriginIsolated, true)
  assert.deepEqual(
    row.counts,
    {
      sync: 400,
      timeout: 0,
      animation_frame: 400,
      microtask: 0,
      promise: 0,
    },
    `Invalid representative workload counters for ${slot}`,
  )
  for (const bucket of [
    'total',
    'sync',
    'timeout',
    'animationFrame',
    'microtask',
    'promise',
    'boot',
  ]) {
    assert(
      Number.isFinite(row[bucket]) && row[bucket] >= 0,
      `${slot} ${bucket}`,
    )
  }
  assert(
    Math.abs(
      row.total -
        median(
          samples
            .filter(sample => sample.slot === slot)
            .map(sample => sample.totalMs),
        ),
    ) <= 0.100001,
    `Reported total median disagrees with rounded samples: ${slot}`,
  )
  reportedMedians[slot] = row
}

const [mainNaive, candidateNaive, mainOptimized, candidateOptimized] = slots
const variants = [
  ['naive', mainNaive, candidateNaive],
  ['optimized', mainOptimized, candidateOptimized],
]
const pairedRounds = Array.from({ length: 8 }, (_, index) => ({
  round: index + 1,
  ...Object.fromEntries(
    variants.map(([variant, main, candidate]) => {
      const before = samples.find(
        sample => sample.round === index + 1 && sample.slot === main,
      ).totalMs
      const after = samples.find(
        sample => sample.round === index + 1 && sample.slot === candidate,
      ).totalMs
      return [
        variant,
        {
          mainMs: before,
          candidateMs: after,
          addedMs: Number((after - before).toFixed(1)),
          percentChange: percent(before, after),
        },
      ]
    }),
  ),
}))
const comparisons = Object.fromEntries(
  variants.map(([variant, main, candidate]) => {
    const before = reportedMedians[main]
    const after = reportedMedians[candidate]
    const range = slot => {
      const values = samples
        .filter(sample => sample.slot === slot)
        .map(sample => sample.totalMs)
      return { minimum: Math.min(...values), maximum: Math.max(...values) }
    }
    return [
      variant,
      {
        main,
        candidate,
        totalMs: {
          main: before.total,
          candidate: after.total,
          added: Number((after.total - before.total).toFixed(1)),
          percentChange: percent(before.total, after.total),
        },
        syncMs: { main: before.sync, candidate: after.sync },
        animationFrameMs: {
          main: before.animationFrame,
          candidate: after.animationFrame,
        },
        rangeMs: { main: range(main), candidate: range(candidate) },
        bundle: {
          main: bundles[main],
          candidate: bundles[candidate],
          addedRawBytes: bundles[candidate].rawBytes - bundles[main].rawBytes,
          addedGzipBytes:
            bundles[candidate].gzipBytes - bundles[main].gzipBytes,
          gzipPercentChange: percent(
            bundles[main].gzipBytes,
            bundles[candidate].gzipBytes,
          ),
        },
      },
    ]
  }),
)

const result = {
  status: 'complete',
  evidenceKind: artifacts.evidenceKind,
  candidateCommit: artifacts.candidateCommit,
  sourceHead: artifacts.sourceHead,
  mainCommit: artifacts.mainCommit,
  sourceInputsSha256: artifacts.sourceInputsSha256,
  sourceInputCount: artifacts.sourceInputs.length,
  rounds: 8,
  samples: 32,
  discardedSamples: 0,
  itemCount: 100,
  rotation: 'Cyclic; each slot appears in each ordinal position twice',
  samplesInOrder: samples,
  reportedMedians,
  pairedRounds,
  comparisons,
  execution,
  preflights,
  artifacts,
  verification: {
    artifactReceiptSha256: sha(readFileSync(artifactPath)),
    executionReceiptSha256: sha(readFileSync(executionPath)),
    preflightResultsSha256: sha(readFileSync(preflightPath)),
    analyserSha256: sha(readFileSync(new URL(import.meta.url))),
    driverReportedHarnessRevision: revision,
    pinnedHarnessRevision: preparation.harnessRevision,
    driverFiles: preparation.driver,
    chromium,
    analysisNode: process.version,
    counterCoverage:
      'The fifth run per slot is printed as a representative counter row; the driver does not emit all per-run counters or bucket timings',
    isolationCoverage:
      'The hash-verified unchanged driver rejects page errors and loss of cross-origin isolation on every run; quiet timing and port closure are execution-receipt attestations',
  },
  limitations: [
    'One same-batch Todo comparison, not a general performance or statistical equivalence claim',
    'Whole candidate versus main; no causal attribution to an individual feature',
    'Individual totals are rounded to one decimal; reported total medians are checked within 0.1 ms',
    'Sync and animation-frame bucket medians are independently reported and cannot be summed to reconstruct the total median',
    'Only representative workload counters are observable; no claim that the analyser checks every run’s counters',
    'Host metadata is captured before and after, not continuous whole-host profiling',
    ...(artifacts.limitations ?? []),
  ],
}
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, {
  flag: 'wx',
})
console.log(
  JSON.stringify(
    { evidenceKind: result.evidenceKind, comparisons, pairedRounds },
    null,
    2,
  ),
)
