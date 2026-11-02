import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const temporary = mkdtempSync(resolve(root, '.runtime-mutation-'))

try {
  for (const path of [
    'src',
    'test',
    'package.json',
    'tsconfig.json',
    'vitest.config.ts',
  ]) {
    cpSync(resolve(root, path), resolve(temporary, path), { recursive: true })
  }

  symlinkSync(resolve(root, 'node_modules'), resolve(temporary, 'node_modules'))

  const config = JSON.parse(
    readFileSync(resolve(root, 'tsconfig.json'), 'utf8'),
  )

  writeFileSync(
    resolve(temporary, 'tsconfig.json'),
    JSON.stringify({ ...config, extends: resolve(root, config.extends) }),
  )

  const file = resolve(temporary, 'src/chatRoom/steps.ts')
  const source = readFileSync(file, 'utf8')
  const mutated = source.replace(
    'MessageComposerBinding.requestClear(),',
    'model => ({ model }),',
  )

  assert.notEqual(mutated, source, 'Mutation must replace child clearing')
  writeFileSync(file, mutated)

  const result = spawnSync(
    process.execPath,
    [
      'node_modules/vitest/vitest.mjs',
      'run',
      '--config',
      'vitest.config.ts',
      'test/runtime.test.ts',
    ],
    {
      cwd: temporary,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    },
  )

  assert.ifError(result.error)

  const output = `${result.stdout}\n${result.stderr}`

  assert.notEqual(
    result.status,
    0,
    'The runtime gate must reject lost clearing',
  )
  assert.match(output, /expected 'Hello' to be ''/, output)
  mkdirSync(resolve(root, 'results'), { recursive: true })
  writeFileSync(
    resolve(root, 'results/runtime-mutation.json'),
    `${JSON.stringify(
      {
        mutation:
          'Replace the connected Composer requestClear Step with a pure identity Step',
        expectedFailure: "expected 'Hello' to be ''",
        status: result.status,
        output,
      },
      null,
      2,
    )}\n`,
  )

  console.log('The public Program runtime test rejects lost child clearing.')
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
