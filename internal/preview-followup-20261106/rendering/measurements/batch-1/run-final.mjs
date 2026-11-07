import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { cpus, freemem, loadavg, platform, release, totalmem } from 'node:os'
import { join } from 'node:path'

assert.equal(process.env.FOLDKIT_BENCH_QUIET_WINDOW, 'confirmed-by-lead', 'Wait for the final committed Source and a quiet build/browser window')

const workspace = '/private/tmp/foldkit-preview-followup-rendering-20261106'
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const slots = ['foldkit-main', 'foldkit-preview-final', 'foldkit-main-optimised', 'foldkit-preview-final-optimised']
const artifactsPath = join(workspace, 'final-artifact-receipt.json')
const artifactReceiptSha256 = sha(readFileSync(artifactsPath))
const preflightDirectory = join(workspace, 'preflight-final')
mkdirSync(preflightDirectory)
const env = { ...process.env, HARNESS_DIR: join(workspace, 'harness'), PORT: '8477' }
const preflights = []
for (const slot of slots) {
  const startedAt = new Date().toISOString()
  const result = spawnSync(process.execPath, [join(workspace, 'driver/verify.mjs')], {
    env: { ...env, IMPL: slot }, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 300_000,
  })
  const completedAt = new Date().toISOString()
  const log = `${slot}.log`
  const bytes = `${result.stdout ?? ''}${result.stderr ?? ''}`
  writeFileSync(join(preflightDirectory, log), bytes, { flag: 'wx' })
  assert.ifError(result.error)
  assert.equal(result.status, 0, bytes)
  assert(bytes.split('\n').includes(`VERIFY ${slot}: OK`))
  preflights.push({ slot, startedAt, completedAt, exitCode: result.status, log, logSha256: sha(bytes), artifactReceiptSha256 })
  console.log(`Fresh preflight passed: ${slot}`)
}
const preflightPath = join(preflightDirectory, 'results.json')
writeFileSync(preflightPath, `${JSON.stringify(preflights, null, 2)}\n`, { flag: 'wx' })
const captureHost = name => {
  const processors = cpus()
  const bytes = `${JSON.stringify({
    at: new Date().toISOString(), platform: platform(), release: release(),
    cpu: processors.at(0)?.model, logicalCpus: processors.length,
    aggregateCpuTimes: processors.reduce((total, cpu) => Object.fromEntries(Object.entries(cpu.times).map(([key, value]) => [key, (total[key] ?? 0) + value])), {}),
    loadAverage: loadavg(), freeMemory: freemem(), totalMemory: totalmem(),
  }, null, 2)}\n`
  writeFileSync(join(workspace, name), bytes, { flag: 'wx' })
  return { file: name, sha256: sha(bytes) }
}
const hostBefore = captureHost('host-before.json')
const startedAt = new Date().toISOString()
const driver = join(workspace, 'driver/run.mjs')
const timingEnv = { ...env, IMPLS: slots.join(','), RUNS: '8' }
const result = spawnSync(process.execPath, [driver], { env: timingEnv, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 1_800_000 })
const bytes = `${result.stdout ?? ''}${result.stderr ?? ''}`
writeFileSync(join(workspace, 'timing-final.log'), bytes, { flag: 'wx' })
const hostAfter = captureHost('host-after.json')
const completedAt = new Date().toISOString()
assert.ifError(result.error)
assert.equal(result.status, 0, bytes)
for (const host of ['127.0.0.1', '::1']) {
  await new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(Number(env.PORT), host, () => server.close(error => error ? reject(error) : resolve()))
  })
}
const receipt = {
  status: 'complete', exitCode: result.status, startedAt, completedAt,
  env: { IMPLS: timingEnv.IMPLS, RUNS: timingEnv.RUNS, HARNESS_DIR: timingEnv.HARNESS_DIR, PORT: timingEnv.PORT },
  driver, log: 'timing-final.log', logSha256: sha(bytes), artifactReceiptSha256,
  preflightResultsSha256: sha(readFileSync(preflightPath)), hostBefore, hostAfter,
  timingIsolation: { buildsAndTestsQuiet: true, otherBrowserChecksQuiet: true },
  benchmarkPortClosedAfterRun: true,
}
writeFileSync(join(workspace, 'timing-final-execution.json'), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' })
console.log(bytes)
console.log(JSON.stringify(receipt, null, 2))
