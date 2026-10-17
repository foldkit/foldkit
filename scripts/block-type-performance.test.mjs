import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'

import { exceededBudgetMetrics } from '../packages/foldkit/scripts/check-block-type-performance.ts'

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..')
const SCRIPT = join(
  REPOSITORY_ROOT,
  'packages/foldkit/scripts/check-block-type-performance.ts',
)
const BUDGETS = join(
  REPOSITORY_ROOT,
  'packages/foldkit/type-performance/budgets.json',
)

const runHarness = args =>
  spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
  })

test('a diagnostic increase beyond a stored budget fails the gate', () => {
  const budget = {
    maxInstantiationsDelta: 12_000,
    maxTypesDelta: 800,
  }

  assert.deepEqual(
    exceededBudgetMetrics(
      { instantiations: 12_000, types: 800, symbols: 1_000 },
      budget,
    ),
    [],
  )
  assert.deepEqual(
    exceededBudgetMetrics(
      { instantiations: 12_001, types: 800, symbols: 1_000 },
      budget,
    ),
    ['Instantiations'],
  )
  assert.deepEqual(
    exceededBudgetMetrics(
      { instantiations: 12_000, types: 801, symbols: 1_000 },
      budget,
    ),
    ['Types'],
  )
})

test('the CLI fails when a real fixture exceeds a mutated budget', context => {
  const temporaryDirectory = mkdtempSync(
    join(tmpdir(), 'foldkit-block-type-performance-test-'),
  )
  context.after(() =>
    rmSync(temporaryDirectory, { recursive: true, force: true }),
  )
  const budgets = JSON.parse(readFileSync(BUDGETS, 'utf8'))
  const fixture = budgets.fixtures['deep-composition-8']
  assert.notEqual(fixture, undefined)
  const path = join(temporaryDirectory, 'budgets.json')
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        ...budgets,
        fixtures: {
          ...budgets.fixtures,
          'deep-composition-8': {
            ...fixture,
            maxInstantiationsDelta: 0,
          },
        },
      },
      null,
      2,
    )}\n`,
  )

  const result = runHarness(['deep-composition-8', '--budgets', path])

  assert.equal(result.status, 1, result.stderr)
  assert.match(result.stdout, /failed: Instantiations/)
  assert.doesNotMatch(result.stdout, /wide-composition-100/)
})

test('the CLI rejects an incomplete budget before compilation', context => {
  const temporaryDirectory = mkdtempSync(
    join(tmpdir(), 'foldkit-block-type-performance-budget-test-'),
  )
  context.after(() =>
    rmSync(temporaryDirectory, { recursive: true, force: true }),
  )
  const budgets = JSON.parse(readFileSync(BUDGETS, 'utf8'))
  const fixture = budgets.fixtures['deep-composition-8']
  assert.notEqual(fixture, undefined)
  const path = join(temporaryDirectory, 'budgets.json')
  const incompleteFixture = {
    maxInstantiationsDelta: fixture.maxInstantiationsDelta,
  }
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        ...budgets,
        fixtures: {
          ...budgets.fixtures,
          'deep-composition-8': incompleteFixture,
        },
      },
      null,
      2,
    )}\n`,
  )

  const result = runHarness(['deep-composition-8', '--budgets', path])

  assert.equal(result.status, 1, result.stdout)
  assert.match(result.stderr, /Invalid type-performance budgets/)
  assert.doesNotMatch(result.stderr, /Measuring baseline/)
})

test('a targeted update cannot mix budgets from TypeScript versions', context => {
  const temporaryDirectory = mkdtempSync(
    join(tmpdir(), 'foldkit-block-type-performance-version-test-'),
  )
  context.after(() =>
    rmSync(temporaryDirectory, { recursive: true, force: true }),
  )
  const budgets = JSON.parse(readFileSync(BUDGETS, 'utf8'))
  const path = join(temporaryDirectory, 'budgets.json')
  writeFileSync(
    path,
    `${JSON.stringify({ ...budgets, typescriptVersion: '0.0.0' }, null, 2)}\n`,
  )

  const result = runHarness([
    '--update',
    'deep-composition-8',
    '--budgets',
    path,
  ])

  assert.equal(result.status, 1, result.stdout)
  assert.match(result.stderr, /Refresh every budget together/)
})
