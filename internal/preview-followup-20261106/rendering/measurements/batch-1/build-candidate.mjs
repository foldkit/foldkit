import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const workspace = '/private/tmp/foldkit-preview-followup-rendering-20261106'
const candidate = join(workspace, 'candidate')
const benchmark = join(candidate, 'internal/lustre-benchmark')
const source = JSON.parse(readFileSync(join(candidate, 'source.json')))
assert.match(process.argv[2] ?? '', /^[a-f0-9]{40}$/)
assert.equal(source.sourceHead, process.argv[2])
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const viteRoot = realpathSync(join(benchmark, 'node_modules/vite'))
const viteVersion = JSON.parse(readFileSync(join(viteRoot, 'package.json'))).version
assert.equal(viteVersion, '8.3.5')
const checks = []
for (const variant of ['naive', 'optimised']) {
  const startedAt = new Date().toISOString()
  const args = [join(viteRoot, 'bin/vite.js'), 'build']
  const result = spawnSync(process.execPath, args, {
    cwd: benchmark,
    env: { ...process.env, BUILD_VARIANT: variant },
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    timeout: 300_000,
  })
  const completedAt = new Date().toISOString()
  const bytes = `${result.stdout ?? ''}${result.stderr ?? ''}`
  const log = `candidate-${variant}-build.log`
  writeFileSync(join(workspace, log), bytes, { flag: 'wx' })
  console.log(bytes)
  assert.ifError(result.error)
  assert.equal(result.status, 0, `Build ${variant} failed; preserve its log`)
  checks.push({ variant, startedAt, completedAt, command: [process.execPath, ...args], cwd: benchmark, exitCode: result.status, log, logSha256: hash(bytes) })
}
for (const file of source.files) {
  assert.equal(hash(readFileSync(join(candidate, file.file))), file.sha256, file.file)
}
writeFileSync(join(workspace, 'candidate-build.json'), `${JSON.stringify({ sourceHead: source.sourceHead, node: process.version, vite: viteVersion, viteRoot, sourceUnchanged: true, checks }, null, 2)}\n`, { flag: 'wx' })
