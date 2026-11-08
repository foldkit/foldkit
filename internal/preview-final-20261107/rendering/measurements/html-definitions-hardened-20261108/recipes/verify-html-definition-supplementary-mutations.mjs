import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = '/private/tmp/foldkit-html-definition-twins-20261107/candidate'
const sourcePath = join(root, 'packages/foldkit/src/html/index.ts')
const outputRoot = '/private/tmp/foldkit-html-hardened-verification-20261108/mutations'
const node = '/Users/devinjameson/.vite-plus/js_runtime/node/26.13.0/bin/node'
const tsc = join(root, 'packages/foldkit/node_modules/typescript/bin/tsc')
const original = readFileSync(sourcePath, 'utf8')
const originalSha256 = '1fcaf6f3e02cc9bf8c5d3a15ec6f274286e85a64adca912444d88345c51014ef'

mkdirSync(outputRoot, { recursive: true })

const replaceExact = (source, before, after) => {
  const first = source.indexOf(before)
  assert.notEqual(first, -1, `missing mutation pattern: ${before}`)
  assert.equal(source.indexOf(before, first + before.length), -1, `ambiguous mutation pattern: ${before}`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

const runExpectedFailure = ({ name, mutate, expected }) => {
  writeFileSync(sourcePath, mutate(original))
  try {
    const command = [tsc, '-p', 'packages/foldkit/tsconfig.json', '--noEmit', '--pretty', 'false']
    const result = spawnSync(node, command, {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1', NO_COLOR: '1' },
    })
    const output = [
      `$ ${node} ${command.join(' ')}`,
      `exit=${result.status}`,
      `expectedRestoredSha256=${originalSha256}`,
      '',
      'stdout:',
      result.stdout ?? '',
      '',
      'stderr:',
      result.stderr ?? '',
    ].join('\n')
    writeFileSync(join(outputRoot, `${name}.log`), output)
    assert.notEqual(result.status, 0, `${name} unexpectedly passed`)
    assert.match(output, expected, `${name} did not produce its targeted diagnostic`)
  } finally {
    writeFileSync(sourcePath, original)
  }
  assert.equal(readFileSync(sourcePath, 'utf8'), original, `${name} did not restore source`)
  process.stdout.write(`${name}: targeted failure, source restored\n`)
}

try {
  runExpectedFailure({
    name: 'wrong-nonvoid-classification',
    mutate: source => replaceExact(source, '  div: false,\n', '  div: true,\n'),
    expected: /Type 'true' is not assignable to type 'false'/,
  })
  runExpectedFailure({
    name: 'missing-attribute-key',
    mutate: source => replaceExact(
      source,
      "  Key: [\n    makeValueAttribute,\n    ({ value }, ctx: BuildContext) => setData(ctx, 'key', value),\n  ],\n",
      '',
    ),
    expected: /Property 'Key' is missing/,
  })
  runExpectedFailure({
    name: 'extra-attribute-key',
    mutate: source => replaceExact(
      source,
      'const attributeDefinitions: AttributeDefinitions = {\n',
      'const attributeDefinitions: AttributeDefinitions = {\n  NotAnAttribute: [undefined, () => {}],\n',
    ),
    expected: /NotAnAttribute/,
  })
} finally {
  writeFileSync(sourcePath, original)
}
