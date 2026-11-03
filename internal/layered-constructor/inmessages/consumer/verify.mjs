import { spawnSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
mkdirSync(resolve(root, 'verification'), { recursive: true })
const output = mkdtempSync(resolve(root, 'verification/run-'))
const repository = resolve(root, '../../../..')
const core = resolve(repository, 'packages/foldkit')
const fixture = resolve(output, 'fixture')
mkdirSync(fixture)
for (const path of [
  'src',
  'test',
  'package.json',
  'tsconfig.json',
  'vitest.config.ts',
  'check-runtime-dependencies.mjs',
  'check-placements.mjs',
  'check-runtime-mutation.mjs',
]) {
  cpSync(resolve(root, path), resolve(fixture, path), { recursive: true })
}
const config = JSON.parse(readFileSync(resolve(root, 'tsconfig.json'), 'utf8'))
writeFileSync(
  resolve(fixture, 'tsconfig.json'),
  JSON.stringify({ ...config, extends: resolve(root, config.extends) }),
)
for (const [name, path] of [
  ['effect', 'node_modules/effect'],
  ['foldkit', 'packages/foldkit'],
  ['@foldkit/ui', 'packages/ui'],
  ['@foldkit/vite-plugin', 'packages/vite-plugin-foldkit'],
  [
    '@effect/platform-browser',
    'packages/foldkit/node_modules/@effect/platform-browser',
  ],
  ['@effect/vitest', 'packages/foldkit/node_modules/@effect/vitest'],
  ['vitest', 'packages/foldkit/node_modules/vitest'],
  ['happy-dom', 'packages/foldkit/node_modules/happy-dom'],
  ['vite', 'node_modules/vite'],
  ['@types/node', 'node_modules/@types/node'],
  ['typescript', 'node_modules/typescript'],
]) {
  const target = resolve(fixture, 'node_modules', name)
  mkdirSync(dirname(target), { recursive: true })
  symlinkSync(realpathSync(resolve(repository, path)), target)
}
const results = []

for (const [name, args] of [
  ['runtime-dependencies', ['check-runtime-dependencies.mjs']],
  [
    'source',
    [
      resolve(core, 'node_modules/typescript/bin/tsc'),
      '-p',
      'tsconfig.json',
      '--noEmit',
    ],
  ],
  [
    'runtime',
    ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.config.ts'],
  ],
  ['placements', ['check-placements.mjs']],
  ['runtime-mutation', ['check-runtime-mutation.mjs']],
]) {
  const result = spawnSync(process.execPath, args, {
    cwd: fixture,
    encoding: 'utf8',
    env: { ...process.env, FOLDKIT_PROOF_REPOSITORY: repository },
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
