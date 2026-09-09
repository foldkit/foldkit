import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT_PATH = 'scripts/plan-examples-e2e.mjs'
const SPEC_SUFFIX = '.spec.ts'
const MAX_SHARD_COUNT = 10
const ZERO_SHA = '0'.repeat(40)
const MISSING_SHA_A = 'deadbeef'.repeat(5)
const MISSING_SHA_B = 'cafebabe'.repeat(5)

const allExampleSlugs = readdirSync(
  resolve(REPO_ROOT, 'packages/examples-e2e/e2e'),
)
  .filter(fileName => fileName.endsWith(SPEC_SUFFIX))
  .map(fileName => fileName.slice(0, -SPEC_SUFFIX.length))
  .sort()

const planExamples = (...args) => {
  const result = spawnSync(process.execPath, [SCRIPT_PATH, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })

  assert.equal(
    result.status,
    0,
    `plan-examples-e2e.mjs exited ${result.status}`,
  )

  const outputs = Object.fromEntries(
    result.stdout
      .split('\n')
      .filter(line => line !== '')
      .map(line => {
        const separatorIndex = line.indexOf('=')
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)]
      }),
  )

  const matrix = JSON.parse(outputs['matrix'])

  return {
    exampleCount: Number(outputs['example-count']),
    matrix,
    shardedSlugs: matrix.include.flatMap(entry =>
      entry.examples === '' ? [] : entry.examples.split(' '),
    ),
  }
}

const planExamplesForFile = fileName => planExamples('base', 'head', fileName)

test('a documentation-only change selects no examples', () => {
  const { exampleCount, shardedSlugs } = planExamplesForFile('README.md')

  assert.equal(exampleCount, 0)
  assert.deepEqual(shardedSlugs, [])
})

test('an example change selects only that example', () => {
  const { exampleCount, shardedSlugs } = planExamplesForFile(
    'examples/counter/src/main.ts',
  )

  assert.equal(exampleCount, 1)
  assert.deepEqual(shardedSlugs, ['counter'])
})

test('a spec change selects only that example', () => {
  const { exampleCount, shardedSlugs } = planExamplesForFile(
    `packages/examples-e2e/e2e/snake${SPEC_SUFFIX}`,
  )

  assert.equal(exampleCount, 1)
  assert.deepEqual(shardedSlugs, ['snake'])
})

test('a foldkit change selects every example', () => {
  const { exampleCount, shardedSlugs } = planExamplesForFile(
    'packages/foldkit/src/runtime/runtime.ts',
  )

  assert.equal(exampleCount, allExampleSlugs.length)
  assert.deepEqual([...shardedSlugs].sort(), allExampleSlugs)
})

test('a markdown change selects every example', () => {
  assert.equal(
    planExamplesForFile('packages/markdown/src/index.ts').exampleCount,
    allExampleSlugs.length,
  )
})

test('an E2E harness change selects every example', () => {
  assert.equal(
    planExamplesForFile('packages/examples-e2e/playwright.config.ts')
      .exampleCount,
    allExampleSlugs.length,
  )
})

test('changing the shared diff helper selects every example', () => {
  assert.equal(
    planExamplesForFile('scripts/lib/changed-files.mjs').exampleCount,
    allExampleSlugs.length,
  )
})

test('an all-zero base revision selects every example', () => {
  assert.equal(
    planExamples(ZERO_SHA, 'head').exampleCount,
    allExampleSlugs.length,
  )
})

test('an unresolvable revision range selects every example', () => {
  assert.equal(
    planExamples(MISSING_SHA_A, MISSING_SHA_B).exampleCount,
    allExampleSlugs.length,
  )
})

test('shards stay bounded and cover each example exactly once', () => {
  const { matrix, shardedSlugs } = planExamplesForFile(
    'packages/foldkit/src/runtime/runtime.ts',
  )

  assert.equal(
    matrix.include.length,
    Math.min(MAX_SHARD_COUNT, allExampleSlugs.length),
  )
  assert.deepEqual([...shardedSlugs].sort(), allExampleSlugs)
  assert.equal(new Set(shardedSlugs).size, shardedSlugs.length)

  const shardNumbers = matrix.include.map(entry => entry.shard)
  assert.deepEqual(
    shardNumbers,
    Array.from({ length: matrix.include.length }, (_, index) => index + 1),
  )

  for (const entry of matrix.include) {
    assert.notEqual(entry.examples, '', `shard ${entry.shard} is empty`)
  }
})

test('shard sizes stay within one example of each other', () => {
  const { matrix } = planExamplesForFile('packages/foldkit/src/runtime.ts')

  const shardSizes = matrix.include.map(
    entry => entry.examples.split(' ').length,
  )

  assert.ok(Math.max(...shardSizes) - Math.min(...shardSizes) <= 1)
})

test('fewer examples than the cap produce one shard each', () => {
  const { matrix } = planExamples(
    'base',
    'head',
    'examples/counter/src/main.ts',
    'examples/snake/src/main.ts',
  )

  assert.equal(matrix.include.length, 2)
})
