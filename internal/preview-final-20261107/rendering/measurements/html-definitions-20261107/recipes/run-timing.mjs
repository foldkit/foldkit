import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { cpus, freemem, loadavg, platform, release, totalmem } from 'node:os'
import { join } from 'node:path'

assert.equal(process.env.FOLDKIT_BENCH_QUIET_WINDOW, 'confirmed-by-lead', 'Run only in the lead-confirmed quiet build and browser window')
const workspace = '/private/tmp/foldkit-html-definition-twins-20261107'
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const slots = [
  'html-baseline-naive-a',
  'html-candidate-naive',
  'html-baseline-optimised-a',
  'html-candidate-optimised',
  'html-baseline-naive-b',
  'html-baseline-optimised-b',
]
const artifactReceiptPath = join(workspace, 'artifact-receipt.json')
const preflightPath = join(workspace, 'preflight/results.json')
const artifactReceiptBytes = readFileSync(artifactReceiptPath)
const preflightBytes = readFileSync(preflightPath)
const artifactReceipt = JSON.parse(artifactReceiptBytes)
const preflight = JSON.parse(preflightBytes)
assert.equal(artifactReceipt.timingPlan.timingStarted, false)
assert.equal(preflight.timingStarted, false)
assert.deepEqual(artifactReceipt.timingPlan.implementations, slots)
assert.deepEqual(preflight.results.map(result => result.slot), slots)
for (const [slot, record] of Object.entries(artifactReceipt.slots)) {
  const root = join(workspace, 'harness/priv/implementations', slot, 'dist')
  for (const file of record.files) {
    const path = join(root, file.file)
    assert(existsSync(path), path)
    assert.equal(sha(readFileSync(path)), file.sha256, path)
  }
}
const chromiumProcesses = () =>
  execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8' })
    .split('\n')
    .filter(line => /ms-playwright.*(?:Chromium|chrome|headless_shell)/i.test(line))
const captureHost = name => {
  const processors = cpus()
  const bytes = `${JSON.stringify({
    at: new Date().toISOString(), platform: platform(), release: release(), cpu: processors.at(0)?.model,
    logicalCpus: processors.length,
    aggregateCpuTimes: processors.reduce((total, cpu) => Object.fromEntries(Object.entries(cpu.times).map(([key, value]) => [key, (total[key] ?? 0) + value])), {}),
    loadAverage: loadavg(), freeMemory: freemem(), totalMemory: totalmem(),
  }, null, 2)}\n`
  writeFileSync(join(workspace, name), bytes, { flag: 'wx' })
  return { file: name, sha256: sha(bytes) }
}
const port = 8602
const env = { ...process.env, HARNESS_DIR: join(workspace, 'harness'), PORT: String(port), IMPLS: slots.join(','), RUNS: '12' }
const browserProcessesBefore = chromiumProcesses()
const hostBefore = captureHost('timing-host-before.json')
const startedAt = new Date().toISOString()
const driver = join(workspace, 'driver/run.mjs')
const result = spawnSync(process.execPath, [driver], { env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 3_600_000 })
const completedAt = new Date().toISOString()
const bytes = `${result.stdout ?? ''}${result.stderr ?? ''}`
writeFileSync(join(workspace, 'timing.log'), bytes, { flag: 'wx' })
const hostAfter = captureHost('timing-host-after.json')
assert.ifError(result.error)
assert.equal(result.status, 0, bytes)
for (const host of ['127.0.0.1', '::1']) {
  await new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(port, host, () => server.close(error => (error ? reject(error) : resolve())))
  })
}
await new Promise(resolve => setTimeout(resolve, 500))
const browserProcessesAfter = chromiumProcesses()
assert.deepEqual(browserProcessesAfter, browserProcessesBefore)
for (let round = 1; round <= 12; round += 1) {
  for (const slot of slots) assert.match(bytes, new RegExp(`\\[round ${round}/12\\] ${slot}:`))
}
const receipt = {
  schemaVersion: 1, status: 'complete', exitCode: result.status, startedAt, completedAt,
  env: { IMPLS: env.IMPLS, RUNS: env.RUNS, HARNESS_DIR: env.HARNESS_DIR, PORT: env.PORT },
  driver, driverSha256: sha(readFileSync(driver)), log: 'timing.log', logSha256: sha(bytes),
  artifactReceiptSha256: sha(artifactReceiptBytes), preflightResultsSha256: sha(preflightBytes), hostBefore, hostAfter,
  timingIsolation: { buildsAndTestsQuiet: true, otherBrowserChecksQuiet: true, confirmedByLead: true },
  cleanup: { portAvailableOnIpv4: true, portAvailableOnIpv6: true, browserProcessesBefore, browserProcessesAfter },
  retainedSamples: 72, discardedSamples: 0, cyclicOrdinalVisitsPerSlot: 2,
}
writeFileSync(join(workspace, 'timing-execution.json'), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' })
console.log(bytes)
console.log(JSON.stringify(receipt, null, 2))
