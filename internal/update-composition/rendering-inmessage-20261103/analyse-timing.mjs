import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const run = '/private/tmp/foldkit-inmessage-rendering-20261103'
const read = name => readFileSync(join(run, name))
const json = name => JSON.parse(read(name))
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const log = read('timing-final.log').toString()
const execution = json('timing-final-execution.json')
const artifacts = json('final-artifact-receipt.json')
const preparation = json('preparation.json')
const preflights = json('preflight-final/results.json')
const slots = execution.env.IMPLS.split(',')
const [mainNaive, candidateNaive, mainOptimized, candidateOptimized] = slots
const harnessRevisionMatch = /harness revision: (.+)/.exec(log)
const chromiumVersionMatch = /^chromium version: (.+)$/m.exec(log)

assert(harnessRevisionMatch)
assert(chromiumVersionMatch)

const [, driverReportedHarnessRevision] = harnessRevisionMatch
const [, chromiumVersion] = chromiumVersionMatch

assert.equal(execution.status, 'complete')
assert.equal(execution.exitCode, 0)
assert.equal(slots.length, 4)
assert.equal(sha(read('timing-final.log')), execution.logSha256)
assert.equal(preflights.length, 4)
assert(preflights.every(result => result.exitCode === 0))

const samples = [
  ...log.matchAll(/^\[round (\d+)\/8\] ([^:]+): ([\d.]+)ms$/gm),
].map(([, round, slot, milliseconds]) => ({
  round: Number(round),
  slot,
  totalMs: Number(milliseconds),
}))
assert.equal(samples.length, 32)

for (let round = 1; round <= 8; round++) {
  const rotation = (round - 1) % 4
  assert.deepEqual(
    samples.filter(sample => sample.round === round).map(sample => sample.slot),
    [...slots.slice(rotation), ...slots.slice(0, rotation)],
  )
}

const medians = Object.fromEntries(
  slots.map(slot => [
    slot,
    JSON.parse(
      log
        .split('\n')
        .find(line => line.startsWith(`${slot} {`))
        .slice(slot.length + 1),
    ),
  ]),
)
assert(Object.values(medians).every(median => median.crossOriginIsolated))
for (const median of Object.values(medians)) {
  assert.deepEqual(median.counts, {
    sync: 400,
    timeout: 0,
    animation_frame: 400,
    microtask: 0,
    promise: 0,
  })
}

const variants = [
  ['naive', mainNaive, candidateNaive],
  ['optimized', mainOptimized, candidateOptimized],
]
const comparisons = Object.fromEntries(
  variants.map(([variant, main, candidate]) => {
    const before = medians[main]
    const after = medians[candidate]
    const mainBundle = artifacts.slots[main].files.find(file =>
      file.file.endsWith('.js'),
    )
    const candidateBundle = artifacts.slots[candidate].files.find(file =>
      file.file.endsWith('.js'),
    )
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
          percentChange: Number(
            (100 * (after.total / before.total - 1)).toFixed(2),
          ),
        },
        syncMs: { main: before.sync, candidate: after.sync },
        animationFrameMs: {
          main: before.animationFrame,
          candidate: after.animationFrame,
        },
        rangeMs: { main: range(main), candidate: range(candidate) },
        bundle: {
          main: mainBundle,
          candidate: candidateBundle,
          addedRawBytes: candidateBundle.bytes - mainBundle.bytes,
          addedGzipBytes: candidateBundle.gzipBytes - mainBundle.gzipBytes,
          gzipPercentChange: Number(
            (
              100 *
              (candidateBundle.gzipBytes / mainBundle.gzipBytes - 1)
            ).toFixed(2),
          ),
        },
      },
    ]
  }),
)

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
          percentChange: Number((100 * (after / before - 1)).toFixed(2)),
        },
      ]
    }),
  ),
}))

const result = {
  status: 'complete',
  evidenceDirectory: run,
  candidateCommit: artifacts.candidateCommit,
  sourceHead: artifacts.sourceHead,
  sourceInputsSha256: artifacts.sourceInputsSha256,
  sourceInputCount: artifacts.sourceInputs.length,
  mainCommit: artifacts.mainCommit,
  execution,
  rounds: 8,
  samples: 32,
  discardedSamples: 0,
  itemCount: 100,
  rotation: 'Cyclic by round; each slot appears in each ordinal position twice',
  samplesInOrder: samples,
  reportedMedians: medians,
  pairedRounds,
  comparisons,
  verification: {
    preflights,
    artifactChecks: artifacts.artifactChecks,
    sourceArtifactReceiptSha256: sha(read('final-artifact-receipt.json')),
    driverReportedHarnessRevision,
    pinnedHarnessRevision: preparation.harnessCommit,
    driverFiles: preparation.driverFiles,
    instrumentationSha256: preparation.instrumentationSha256,
    adapter: artifacts.adapter,
    hostBeforeSha256: sha(read('host-before.txt')),
    hostAfterSha256: sha(read('host-after.txt')),
    benchmarkPortClosedAfterRun: true,
  },
  toolchain: {
    chromium: chromiumVersion,
    node: '22.22.3',
    typescript: '7.1.0-beta',
    vite: '8.3.5',
    effect: '4.1.0',
    playwright: '1.63.0',
  },
  limitations: [
    'One same-batch workload comparison; not a general performance or statistical equivalence claim',
    'Whole preview versus main; no causal attribution to a single feature or commit',
    'Main artifacts were reused after hash validation against the previous frozen main checkpoint',
    'Copied harness has no .git metadata; driver reports unknown while its bytes and instrumentation match the pinned revision',
    'Matched cached dependencies, not two fresh installations from branch lockfiles',
    'Only the scratch completion adapters differ from the established unchanged Todo workload',
    'Host CPU metadata captured before and after, not continuous whole-host profiling',
  ],
}

writeFileSync(
  join(run, 'timing-analysis.json'),
  `${JSON.stringify(result, null, 2)}\n`,
  { flag: 'wx' },
)
console.log(
  JSON.stringify(
    {
      comparisons,
      pairedRounds,
      sourceInputsSha256: result.sourceInputsSha256,
    },
    null,
    2,
  ),
)
