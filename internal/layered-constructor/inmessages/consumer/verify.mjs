import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
mkdirSync(resolve(root, 'verification'), { recursive: true })
const output = mkdtempSync(resolve(root, 'verification/run-'))
const results = []

for (const [name, args] of [
  ['runtime-dependencies', ['check-runtime-dependencies.mjs']],
  [
    'source',
    ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json', '--noEmit'],
  ],
  [
    'runtime',
    ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.config.ts'],
  ],
  ['placements', ['check-placements.mjs']],
  ['runtime-mutation', ['check-runtime-mutation.mjs']],
]) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
  })
  const log = `${result.stdout ?? ''}${result.stderr ?? ''}`
  writeFileSync(resolve(output, `${name}.log`), log)
  results.push({ name, args, status: result.status })
  writeFileSync(
    resolve(output, 'results.json'),
    `${JSON.stringify({ results }, null, 2)}\n`,
  )

  if (result.error !== undefined || result.status !== 0) {
    console.error(`${name} failed; ${output}\n${log}`)
    process.exitCode = 1
    break
  }
}

if (process.exitCode !== 1) {
  console.log(
    `InMessage chat source, runtime, and mutation checks passed: ${output}`,
  )
}
