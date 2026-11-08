import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = '/private/tmp/foldkit-html-definition-twins-20261107/candidate'
const sourcePath = join(root, 'packages/foldkit/src/html/index.ts')
const outputRoot = '/private/tmp/foldkit-html-hardened-verification-20261108/mutations'
const node = '/Users/devinjameson/.vite-plus/js_runtime/node/26.13.0/bin/node'
const tsc = join(root, 'packages/foldkit/node_modules/typescript/bin/tsc')
const vitest = join(root, 'packages/foldkit/node_modules/vitest/vitest.mjs')
const original = readFileSync(sourcePath, 'utf8')

mkdirSync(outputRoot, { recursive: true })

const replaceExact = (source, before, after) => {
  const first = source.indexOf(before)
  assert.notEqual(first, -1, `missing mutation pattern: ${before}`)
  assert.equal(source.indexOf(before, first + before.length), -1, `ambiguous mutation pattern: ${before}`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

const runExpectedFailure = ({ name, mutate, command, expected }) => {
  writeFileSync(sourcePath, mutate(original))
  try {
    const result = spawnSync(node, command, {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1', NO_COLOR: '1' },
    })
    const output = `$ ${node} ${command.join(' ')}\nexit=${result.status}\n\nstdout:\n${result.stdout}\n\nstderr:\n${result.stderr}`
    writeFileSync(join(outputRoot, `${name}.log`), output)
    assert.notEqual(result.status, 0, `${name} unexpectedly passed`)
    assert.match(output, expected, `${name} did not produce its targeted diagnostic`)
  } finally {
    writeFileSync(sourcePath, original)
  }
  assert.equal(readFileSync(sourcePath, 'utf8'), original, `${name} did not restore source`)
}

const sourceFailure = command => [tsc, '-p', 'packages/foldkit/tsconfig.json', '--noEmit', '--pretty', 'false', ...command]
const runtimeFailure = [vitest, 'run', 'packages/foldkit/src/html/attributeConstruction.test.ts', '--reporter=verbose']

const controls = [
  {
    name: 'missing-element-key',
    mutate: source => replaceExact(source, '  a: false,\n', ''),
    command: sourceFailure([]),
    expected: /Property 'a' is missing/,
  },
  {
    name: 'extra-element-key',
    mutate: source => replaceExact(source, '  a: false,\n', '  a: false,\n  notAnElement: false,\n'),
    command: sourceFailure([]),
    expected: /notAnElement/,
  },
  {
    name: 'wrong-void-classification',
    mutate: source => replaceExact(source, '  input: true,\n', '  input: false,\n'),
    command: sourceFailure([]),
    expected: /Type 'false' is not assignable to type 'true'/,
  },
  {
    name: 'ordinary-tag-undefined-factory',
    mutate: source => replaceExact(source, '  Key: [\n    makeValueAttribute,', '  Key: [\n    undefined,'),
    command: sourceFailure([]),
    expected: /Type 'undefined' is not assignable/,
  },
  {
    name: 'raw-prop-factory',
    mutate: source => replaceExact(source, '  Prop: [\n    undefined,', '  Prop: [\n    makeValueAttribute,'),
    command: sourceFailure([]),
    expected: /Type '<Tag extends ValueAttribute/,
  },
  {
    name: 'raw-custom-event-factory',
    mutate: source => replaceExact(source, '  OnCustomEvent: [\n    undefined,', '  OnCustomEvent: [\n    makeValueAttribute,'),
    command: sourceFailure([]),
    expected: /Type '<Tag extends ValueAttribute/,
  },
  {
    name: 'wrong-shared-factory-arity',
    mutate: source => replaceExact(
      source,
      "  (value: Extract<ValueAttribute, { _tag: Tag }>['value']) => ({",
      "  (value: Extract<ValueAttribute, { _tag: Tag }>['value'], _extra?: unknown) => ({",
    ),
    command: runtimeFailure,
    expected: /expected 2 to be 1|expected.*1.*received.*2/i,
  },
  {
    name: 'wrong-shared-factory-name',
    mutate: source => replaceExact(source, "        value: tag,\n", "        value: `${tag}Wrong`,\n"),
    command: runtimeFailure,
    expected: /ClassWrong|expected.*Class/i,
  },
]

try {
  for (const control of controls) {
    runExpectedFailure(control)
    process.stdout.write(`${control.name}: targeted failure, source restored\n`)
  }
} finally {
  writeFileSync(sourcePath, original)
}
