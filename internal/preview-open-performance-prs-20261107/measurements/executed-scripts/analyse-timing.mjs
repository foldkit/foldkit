import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const workspace = '/private/tmp/foldkit-direct-attributes-20261107-06UygU'
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
assert.equal(execution.cleanup.portAvailableOnIpv4, true)
assert.equal(execution.cleanup.portAvailableOnIpv6, true)
assert.deepEqual(
  execution.cleanup.browserProcessesAfter,
  execution.cleanup.browserProcessesBefore,
)

const slots = execution.env.IMPLS.split(',')
assert.equal(slots.length, 6)
assert.equal(execution.env.RUNS, '12')
const samples = [
  ...log.matchAll(/^\[round (\d+)\/12\] ([^:]+): ([\d.]+)ms$/gm),
].map(match => ({
  round: Number(match[1]),
  slot: match[2],
  total: Number(match[3]),
}))
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
  [...log.matchAll(/^([^ ]+) (\{.+\})$/gm)]
    .filter(match => slots.includes(match[1]))
    .map(match => [match[1], JSON.parse(match[2])]),
)
assert.deepEqual(Object.keys(summary), slots)
for (const row of Object.values(summary)) {
  assert.equal(row.crossOriginIsolated, true)
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

const analyseVariant = ({ name, baselineA, candidate, baselineB }) => {
  const rounds = []
  for (let round = 1; round <= 12; round += 1) {
    const baselineAValue = valueFor(round, baselineA)
    const candidateValue = valueFor(round, candidate)
    const baselineBValue = valueFor(round, baselineB)
    const baselineMidpoint = (baselineAValue + baselineBValue) / 2
    rounds.push({
      round,
      baselineA: baselineAValue,
      candidate: candidateValue,
      baselineB: baselineBValue,
      baselineMidpoint: rounded(baselineMidpoint),
      candidateMinusBaselineMidpoint: rounded(
        candidateValue - baselineMidpoint,
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
    round => round.candidateMinusBaselineMidpoint,
  )
  const duplicateDifferences = rounds.map(
    round => round.duplicateBaselineAbsoluteDifference,
  )
  const candidateMedian = summary[candidate].total
  const baselineMedianMidpoint =
    (summary[baselineA].total + summary[baselineB].total) / 2
  return {
    name,
    slots: { baselineA, candidate, baselineB },
    summary: {
      baselineAMedian: summary[baselineA].total,
      candidateMedian,
      baselineBMedian: summary[baselineB].total,
      baselineMedianMidpoint: rounded(baselineMedianMidpoint),
      candidateMinusBaselineMedianMidpoint: rounded(
        candidateMedian - baselineMedianMidpoint,
      ),
      candidateFasterRounds: pairedDeltas.filter(delta => delta < 0).length,
      candidateSlowerRounds: pairedDeltas.filter(delta => delta > 0).length,
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
        candidate: summary[candidate].sync,
        baselineB: summary[baselineB].sync,
      },
      animationFrame: {
        baselineA: summary[baselineA].animationFrame,
        candidate: summary[candidate].animationFrame,
        baselineB: summary[baselineB].animationFrame,
      },
    },
    rounds,
  }
}

const variants = [
  analyseVariant({
    name: 'naive',
    baselineA: 'attribute-baseline-naive-a',
    candidate: 'attribute-candidate-naive',
    baselineB: 'attribute-baseline-naive-b',
  }),
  analyseVariant({
    name: 'optimised',
    baselineA: 'attribute-baseline-optimised-a',
    candidate: 'attribute-candidate-optimised',
    baselineB: 'attribute-baseline-optimised-b',
  }),
]
const naive = variants[0].summary
const optimised = variants[1].summary

const analysis = {
  schemaVersion: 1,
  evidenceKind: 'measured',
  analysedAt: new Date().toISOString(),
  execution: { file: 'timing-execution.json', sha256: sha(executionBytes) },
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
    status: 'does-not-meet-optimised-acceptance-criterion',
    reasons: [
      `The naive candidate median (${naive.candidateMedian} ms) is below both byte-identical baseline medians (${naive.baselineAMedian} and ${naive.baselineBMedian} ms), so a view-construction or allocation benefit remains plausible. However, it was faster than the same-round baseline midpoint in only ${naive.candidateFasterRounds}/12 rounds and its paired median delta (${naive.medianPairedDelta} ms) is far smaller than the duplicate-baseline median absolute spread (${naive.medianDuplicateBaselineAbsoluteDifference} ms).`,
      `The optimised candidate median (${optimised.candidateMedian} ms) lies between its byte-identical baseline medians (${optimised.baselineAMedian} and ${optimised.baselineBMedian} ms). Its paired median delta (${optimised.medianPairedDelta} ms) is also smaller than the duplicate-baseline median absolute spread (${optimised.medianDuplicateBaselineAbsoluteDifference} ms), so it does not demonstrate a reliable reduction in the measured optimised regression.`,
      'This end-to-end driver cannot resolve the expected Attribute-construction effect against the observed duplicate-baseline variation; a separate focused construction/allocation workload would be required to test that narrower hypothesis.',
    ],
    profileRecommended: false,
    integrateAsPreviewRegressionFix: false,
    retainPrototypeForFocusedAttributeBenchmark: true,
  },
  limitations: [
    'The unchanged driver prints per-run totals rounded to 0.1 ms and only representative median bucket counters, not unrounded per-run bucket values.',
    'The duplicate baseline controls quantify variation in this batch; they do not identify its source.',
  ],
}
writeFileSync(
  join(workspace, 'timing-analysis.json'),
  `${JSON.stringify(analysis, null, 2)}\n`,
  { flag: 'wx' },
)
console.log(JSON.stringify(analysis, null, 2))
