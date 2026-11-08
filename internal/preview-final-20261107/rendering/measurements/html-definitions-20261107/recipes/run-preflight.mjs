import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { join } from 'node:path'

const workspace = '/private/tmp/foldkit-html-definition-twins-20261107'
const node = '/Users/devinjameson/.vite-plus/js_runtime/node/26.13.0/bin/node'
const slots = [
  'html-baseline-naive-a',
  'html-candidate-naive',
  'html-baseline-optimised-a',
  'html-candidate-optimised',
  'html-baseline-naive-b',
  'html-baseline-optimised-b',
]
const port = 8601
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const artifactBytes = readFileSync(join(workspace, 'artifact-receipt.json'))
mkdirSync(join(workspace, 'preflight'), { recursive: true })

const chromiumProcesses = () =>
  execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8' })
    .split('\n')
    .filter(line => /ms-playwright.*(?:Chromium|chrome|headless_shell)/i.test(line))
const assertPortAvailable = host =>
  new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(port, host, () => server.close(error => (error ? reject(error) : resolve())))
  })

await assertPortAvailable('127.0.0.1')
await assertPortAvailable('::1')
const browserProcessesBefore = chromiumProcesses()
const results = []
for (const slot of slots) {
  const startedAt = new Date().toISOString()
  const result = spawnSync(node, [join(workspace, 'driver/verify.mjs')], {
    env: { ...process.env, HARNESS_DIR: join(workspace, 'harness'), IMPL: slot, PORT: String(port) },
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 16 * 1024 * 1024,
  })
  const bytes = `${result.stdout ?? ''}${result.stderr ?? ''}`
  const log = `${slot}.log`
  writeFileSync(join(workspace, 'preflight', log), bytes, { flag: 'wx' })
  assert.ifError(result.error)
  assert.equal(result.status, 0, bytes)
  assert.match(bytes, new RegExp(`VERIFY ${slot}: OK`))
  results.push({ slot, startedAt, completedAt: new Date().toISOString(), exitCode: result.status, log, logSha256: sha(bytes) })
  console.log(`preflight ${slot}: OK`)
}
await assertPortAvailable('127.0.0.1')
await assertPortAvailable('::1')
await new Promise(resolve => setTimeout(resolve, 500))
const browserProcessesAfter = chromiumProcesses()
assert.deepEqual(browserProcessesAfter, browserProcessesBefore)

const receipt = {
  schemaVersion: 1,
  completedAt: new Date().toISOString(),
  artifactReceiptSha256: sha(artifactBytes),
  harnessRoot: join(workspace, 'harness'),
  driver: join(workspace, 'driver/verify.mjs'),
  driverSha256: sha(readFileSync(join(workspace, 'driver/verify.mjs'))),
  port,
  timingStarted: false,
  results,
  cleanup: { portAvailableOnIpv4: true, portAvailableOnIpv6: true, browserProcessesBefore, browserProcessesAfter },
}
writeFileSync(join(workspace, 'preflight/results.json'), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' })
