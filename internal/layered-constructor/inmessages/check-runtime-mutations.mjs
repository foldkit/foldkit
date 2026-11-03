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
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const repository = resolve(root, '../../..')
const framework = resolve(repository, 'packages/foldkit')
mkdirSync(resolve(root, 'verification'), { recursive: true })
const temporary = mkdtempSync(resolve(tmpdir(), 'foldkit-inmessage-runtime-'))
const results = mkdtempSync(resolve(root, 'verification/runtime-'))
const file = 'src/experimental/contracted/inMessageUpdate.test.ts'

const run = label => {
  const result = spawnSync(
    process.execPath,
    ['node_modules/vitest/vitest.mjs', 'run', file],
    {
      cwd: temporary,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    },
  )
  assert.ifError(result.error)
  const output = `${result.stdout}\n${result.stderr}`
  writeFileSync(resolve(results, `${label}.log`), output)
  return { label, status: result.status, output }
}

const cases = [
  {
    name: 'unchecked-payload',
    path: 'src/block/delivery.ts',
    before: '!Predicate.isObject(input) || !isInput(input)',
    after: '!Predicate.isObject(input)',
    failure: /validates the decoded payload[\s\S]*expected.*to throw/,
  },
  {
    name: 'input-in-local-codec',
    path: 'src/experimental/constructed/runtime.ts',
    before: 'const Message = Schema.make(implementation.Message.ast)',
    after:
      'const Message = Schema.make(blockInMessageUpdateOf(implementation)?.InMessage.ast ?? implementation.Message.ast)',
    failure:
      /keeps input-only Blocks message-free[\s\S]*expected true to be false/,
  },
  {
    name: 'discarded-input-result',
    path: 'src/experimental/contracted/inMessageUpdate.ts',
    before: 'inMessageUpdate(model, ...prepare(...args))',
    after: '({ model })',
    failure: /keeps input-only Blocks message-free[\s\S]*expected \+0 to be 1/,
  },
  {
    name: 'foreign-receive-plan',
    path: 'src/experimental/hybrid/authoring.ts',
    before: 'if (stored.composition !== staticComposition) {',
    after: 'if (false) {',
    failure:
      /requires an inMessageUpdate plan from the selected Composition[\s\S]*promise resolved/,
  },
  {
    name: 'public-instead-of-normalized-graph',
    path: 'src/experimental/contracted/runtime.ts',
    before: 'compositionOperationGraphOf(actual)',
    after: 'actual.bindings',
    failure:
      /executes nested inMessageUpdate[\s\S]*not registered in the current Block graph/,
  },
]

try {
  for (const path of ['src', 'package.json', 'vitest.config.ts']) {
    cpSync(resolve(framework, path), resolve(temporary, path), {
      recursive: true,
    })
  }
  symlinkSync(
    resolve(framework, 'node_modules'),
    resolve(temporary, 'node_modules'),
  )
  mkdirSync(resolve(temporary, 'dist'), { recursive: true })
  const baseline = run('baseline')
  assert.equal(baseline.status, 0, baseline.output)

  const receipts = []
  for (const control of cases) {
    const target = resolve(temporary, control.path)
    const source = readFileSync(target, 'utf8')
    assert.equal(source.split(control.before).length, 2, control.name)
    writeFileSync(target, source.replace(control.before, control.after))
    try {
      const result = run(control.name)
      assert.notEqual(result.status, 0, result.output)
      assert.match(result.output, control.failure, result.output)
      receipts.push({ name: control.name, status: result.status })
    } finally {
      writeFileSync(target, source)
    }
  }

  const restored = run('restored')
  assert.equal(restored.status, 0, restored.output)
  writeFileSync(
    resolve(results, 'results.json'),
    `${JSON.stringify({ baseline: baseline.status, controls: receipts, restored: restored.status }, null, 2)}\n`,
  )
  console.log(
    `Five runtime mutations rejected; restored suite passes. ${results}`,
  )
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
