import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixture = dirname(fileURLToPath(import.meta.url))
const run = file => {
  const result = spawnSync(process.execPath, [join(fixture, file)], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })
  assert.ifError(result.error)
  process.stdout.write(result.stdout ?? '')
  process.stderr.write(result.stderr ?? '')
  return result
}
const emitted = run('emit.mjs')
const emission = (emitted.stdout ?? '').trim().split('\n').at(-1)
assert(emission && existsSync(join(emission, 'emission-results.json')))
const consumed = spawnSync(
  process.execPath,
  [join(fixture, 'consume.mjs'), emission],
  { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
)
assert.ifError(consumed.error)
process.stdout.write(consumed.stdout ?? '')
process.stderr.write(consumed.stderr ?? '')
const consumer = (consumed.stdout ?? '').trim().split('\n').at(-1)
assert(consumer && existsSync(join(consumer, 'results.json')))
const result = JSON.parse(readFileSync(join(consumer, 'results.json'), 'utf8'))
const summary = {
  wholeProjectEmission: emitted.status === 0 ? 'passed' : 'failed',
  publicRoots: result.publicRootStatus,
  mutationControl: result.mutationControlStatus,
  apps: result.apps,
  emission,
  consumer,
}
writeFileSync(
  join(emission, 'summary.json'),
  JSON.stringify(summary, null, 2) + '\n',
)
process.stdout.write(JSON.stringify(summary, null, 2) + '\n')
if (emitted.status !== 0 || consumed.status !== 0) {
  process.exitCode = 1
}
