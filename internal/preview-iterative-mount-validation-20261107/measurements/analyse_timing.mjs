import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const workspace = '/private/tmp/foldkit-mount-iterative-20261107-32wcjI'
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const artifactBytes = readFileSync(join(workspace, 'artifact-receipt.json'))
const preflightBytes = readFileSync(join(workspace, 'preflight/results.json'))
const executionBytes = readFileSync(join(workspace, 'timing-execution.json'))
const execution = JSON.parse(executionBytes)
const logBytes = readFileSync(join(workspace, execution.log))
const log = logBytes.toString()
assert.equal(execution.status, 'complete')
assert.equal(execution.exitCode, 0)
assert.equal(execution.logSha256, sha(logBytes))
assert.equal(execution.artifactReceiptSha256, sha(artifactBytes))
assert.equal(execution.preflightResultsSha256, sha(preflightBytes))
assert.equal(execution.retainedSamples, 72)
assert.equal(execution.discardedSamples, 0)
assert.equal(execution.benchmarkPortClosedAfterRun, true)

const slots = execution.env.IMPLS.split(',')
assert.equal(slots.length, 6)
assert.equal(execution.env.RUNS, '12')
const samples = [...log.matchAll(/^\[round (\d+)\/12\] ([^:]+): ([\d.]+)ms$/gm)].map(
  match => ({
    round: Number(match[1]),
    slot: match[2],
    total: Number(match[3]),
  }),
)
assert.equal(samples.length, 72)
for (let round = 1; round <= 12; round += 1) {
  const actual = samples
    .filter(sample => sample.round === round)
    .map(sample => sample.slot)
  const offset = (round - 1) % slots.length
  const expected = [...slots.slice(offset), ...slots.slice(0, offset)]
  assert.deepEqual(actual, expected)
}

const summary = Object.fromEntries(
  [...log.matchAll(/^(mount-[^ ]+) (\{.+\})$/gm)].map(match => [
    match[1],
    JSON.parse(match[2]),
  ]),
)
assert.deepEqual(Object.keys(summary), slots)
for (const row of Object.values(summary)) {
  assert.deepEqual(row.counts, {
    sync: 400,
    timeout: 0,
    animation_frame: 400,
    microtask: 0,
    promise: 0,
  })
}

const median = numbers => {
  const sorted = [...numbers].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}
const rounded = value => Number(value.toFixed(2))
const valueFor = (round, slot) =>
  samples.find(sample => sample.round === round && sample.slot === slot).total

const analyseVariant = ({ name, baselineA, experiment, baselineB }) => {
  const rounds = []
  for (let round = 1; round <= 12; round += 1) {
    const baselineAValue = valueFor(round, baselineA)
    const experimentValue = valueFor(round, experiment)
    const baselineBValue = valueFor(round, baselineB)
    const baselineMidpoint = (baselineAValue + baselineBValue) / 2
    rounds.push({
      round,
      baselineA: baselineAValue,
      experiment: experimentValue,
      baselineB: baselineBValue,
      baselineMidpoint: rounded(baselineMidpoint),
      experimentMinusBaselineMidpoint: rounded(
        experimentValue - baselineMidpoint,
      ),
      duplicateBaselineSignedDifference: rounded(
        baselineAValue - baselineBValue,
      ),
      duplicateBaselineAbsoluteDifference: rounded(
        Math.abs(baselineAValue - baselineBValue),
      ),
    })
  }
  const pairedDeltas = rounds.map(
    round => round.experimentMinusBaselineMidpoint,
  )
  const duplicateDifferences = rounds.map(
    round => round.duplicateBaselineAbsoluteDifference,
  )
  const experimentMedian = summary[experiment].total
  const baselineMedianMidpoint =
    (summary[baselineA].total + summary[baselineB].total) / 2
  return {
    name,
    slots: { baselineA, experiment, baselineB },
    summary: {
      baselineAMedian: summary[baselineA].total,
      experimentMedian,
      baselineBMedian: summary[baselineB].total,
      baselineMedianMidpoint: rounded(baselineMedianMidpoint),
      experimentMinusBaselineMedianMidpoint: rounded(
        experimentMedian - baselineMedianMidpoint,
      ),
      experimentFasterRounds: pairedDeltas.filter(delta => delta < 0).length,
      experimentSlowerRounds: pairedDeltas.filter(delta => delta > 0).length,
      tiedRounds: pairedDeltas.filter(delta => delta === 0).length,
      medianPairedDelta: rounded(median(pairedDeltas)),
      minimumPairedDelta: Math.min(...pairedDeltas),
      maximumPairedDelta: Math.max(...pairedDeltas),
      medianDuplicateBaselineAbsoluteDifference: rounded(
        median(duplicateDifferences),
      ),
      maximumDuplicateBaselineAbsoluteDifference: Math.max(
        ...duplicateDifferences,
      ),
      sync: {
        baselineA: summary[baselineA].sync,
        experiment: summary[experiment].sync,
        baselineB: summary[baselineB].sync,
      },
      animationFrame: {
        baselineA: summary[baselineA].animationFrame,
        experiment: summary[experiment].animationFrame,
        baselineB: summary[baselineB].animationFrame,
      },
    },
    rounds,
  }
}

const variants = [
  analyseVariant({
    name: 'naive',
    baselineA: 'mount-baseline-naive-a',
    experiment: 'mount-experiment-naive',
    baselineB: 'mount-baseline-naive-b',
  }),
  analyseVariant({
    name: 'optimised',
    baselineA: 'mount-baseline-optimised-a',
    experiment: 'mount-experiment-optimised',
    baselineB: 'mount-baseline-optimised-b',
  }),
]

const analysis = {
  schemaVersion: 1,
  evidenceKind: 'measured',
  analysedAt: new Date().toISOString(),
  execution: {
    file: 'timing-execution.json',
    sha256: sha(executionBytes),
  },
  artifactReceipt: {
    file: 'artifact-receipt.json',
    sha256: sha(artifactBytes),
  },
  preflightResults: {
    file: 'preflight/results.json',
    sha256: sha(preflightBytes),
  },
  retainedSamples: samples.length,
  discardedSamples: 0,
  cyclicOrderingVerified: true,
  ordinalVisitsPerSlot: 2,
  variants,
  decision: {
    status: 'reject',
    reasons: [
      'The optimized experiment was faster in six paired rounds and slower in six, so improvement is not consistent.',
      'The optimized experiment median lies between the two byte-identical baseline medians and its paired median delta is within duplicate-baseline variation.',
      'The naive experiment was slower in seven of twelve paired rounds and had a slower median than either baseline copy.',
    ],
    profileRecommended: false,
    retainSourceChange: false,
  },
  limitations: [
    'The unchanged driver prints per-run totals rounded to 0.1 ms and only representative median bucket counters, not unrounded per-run bucket values.',
    'The duplicate baseline controls quantify variation in this batch; they do not identify the source of that variation.',
  ],
}
writeFileSync(
  join(workspace, 'timing-analysis.json'),
  `${JSON.stringify(analysis, null, 2)}\n`,
  { flag: 'wx' },
)
console.log(JSON.stringify(analysis, null, 2))
