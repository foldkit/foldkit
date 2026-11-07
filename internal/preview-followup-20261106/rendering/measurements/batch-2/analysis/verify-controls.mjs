import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [artifactPath, executionPath, preflightPath, outputPath] =
  process.argv.slice(2)
assert(
  artifactPath && executionPath && preflightPath && outputPath,
  'Usage: node verify-controls.mjs ARTIFACTS EXECUTION PREFLIGHTS OUTPUT',
)
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const artifacts = JSON.parse(readFileSync(artifactPath, 'utf8'))
const execution = JSON.parse(readFileSync(executionPath, 'utf8'))
const log = readFileSync(resolve(dirname(artifactPath), execution.log), 'utf8')
const work = mkdtempSync(join(tmpdir(), 'foldkit-rendering-analysis-controls-'))
const analyser = fileURLToPath(new URL('./analyse-timing.mjs', import.meta.url))
const run = (name, input, expectedFailure) => {
  const path = join(work, `${name}.execution.json`)
  writeFileSync(path, `${JSON.stringify(input, null, 2)}\n`)
  const result = spawnSync(
    process.execPath,
    [
      analyser,
      resolve(artifactPath),
      path,
      resolve(preflightPath),
      join(work, `${name}.analysis.json`),
    ],
    { encoding: 'utf8' },
  )
  writeFileSync(join(work, `${name}.log`), result.stdout + result.stderr)
  if (expectedFailure) {
    assert.notEqual(result.status, 0, `${name} was accepted`)
    assert(
      result.stderr.includes(expectedFailure),
      `${name} failed at the wrong gate`,
    )
  } else {
    assert.equal(result.status, 0, `${name}: ${result.stderr}`)
  }
  return {
    name,
    exitCode: result.status,
    expectedFailure: expectedFailure ?? null,
  }
}
const baseline = {
  ...execution,
  log: resolve(dirname(artifactPath), execution.log),
}
const copiedDriver = join(work, 'foreign-driver.mjs')
writeFileSync(copiedDriver, readFileSync(execution.driver))
const foreignHarness = join(work, 'foreign-harness')
mkdirSync(foreignHarness)
const results = [
  run('unchanged', baseline),
  run('foreign-driver', { ...baseline, driver: copiedDriver }, 'Unexpected physical benchmark driver'),
  run('foreign-harness', {
    ...baseline,
    env: { ...baseline.env, HARNESS_DIR: foreignHarness },
  }, 'Unexpected physical harness'),
]
const [firstSlot] = execution.env.IMPLS.split(',')
const counterLog = log
  .split('\n')
  .map(line => {
    if (!line.startsWith(`${firstSlot} {`)) {
      return line
    }

    const split = line.indexOf(' ')
    const row = JSON.parse(line.slice(split + 1))
    row.counts.sync -= 1
    return `${line.slice(0, split)} ${JSON.stringify(row)}`
  })
  .join('\n')
const omittedSampleLog = log.replace(/^\[round \d+\/8\] [^\n]+\n/m, '')
assert.notEqual(counterLog, log)
assert.notEqual(omittedSampleLog, log)
for (const [name, changedLog, gate] of [
  ['wrong-counter', counterLog, 'Invalid representative workload counters'],
  ['omitted-sample', omittedSampleLog, 'Expected 32 timing samples'],
]) {
  const path = join(work, `${name}.timing.log`)
  writeFileSync(path, changedLog)
  results.push(
    run(name, { ...execution, log: path, logSha256: sha(changedLog) }, gate),
  )
}
writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      status: 'complete',
      evidenceKind: artifacts.evidenceKind,
      work,
      artifactReceiptSha256: sha(readFileSync(artifactPath)),
      executionReceiptSha256: sha(readFileSync(executionPath)),
      originalLogSha256: sha(log),
      refreshedMutationLogHashes: true,
      results,
    },
    null,
    2,
  )}\n`,
  { flag: 'wx' },
)
console.log(JSON.stringify({ work, results }, null, 2))
