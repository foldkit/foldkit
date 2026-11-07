import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { cpus, freemem, loadavg, platform, release, totalmem } from 'node:os'
import { join } from 'node:path'

assert.equal(process.env.FOLDKIT_BENCH_QUIET_WINDOW, 'confirmed-by-lead', 'Wait for the final committed Source and a quiet build/browser window')

const workspace = '/private/tmp/foldkit-record-release-rendering-xpwmm820'
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
console.log(JSON.stringify({status: "functional-preflights-only", artifactReceiptSha256, preflightResults: preflightPath}, null, 2))
