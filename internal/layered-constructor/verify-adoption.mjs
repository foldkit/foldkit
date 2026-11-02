import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
const repository = resolve(directory, '../..')
const core = join(repository, 'packages/foldkit')
const compiler = join(core, 'node_modules/typescript/bin/tsc')
const budget = join(core, 'type-performance/budgets.json')
const budgetHash = () =>
  createHash('sha256').update(readFileSync(budget)).digest('hex')
const originalBudgetHash = budgetHash()
const verification = join(directory, 'adoption-checks/verification')
mkdirSync(verification, { recursive: true })
const artifacts = mkdtempSync(join(verification, 'final-'))

const node = (name, args, cwd = repository) => ({
  name,
  command: process.execPath,
  args,
  cwd,
})
const checks = [
  node('build', [
    compiler,
    '-b',
    'packages/foldkit/tsconfig.build.json',
    'packages/ui/tsconfig.build.json',
    '--pretty',
    'false',
  ]),
  node('core-source', [
    compiler,
    '-p',
    'packages/foldkit/tsconfig.json',
    '--noEmit',
  ]),
  node('ui-source', [compiler, '-p', 'packages/ui/tsconfig.json', '--noEmit']),
  node('core-runtime', ['node_modules/vitest/vitest.mjs', 'run'], core),
  node(
    'ui-runtime',
    ['node_modules/vitest/vitest.mjs', 'run'],
    join(repository, 'packages/ui'),
  ),
  node('emitted-declarations', ['scripts/check-emitted-declarations.ts'], core),
  node(
    'ui-emitted-declarations',
    ['scripts/check-emitted-declarations.ts'],
    join(repository, 'packages/ui'),
  ),
  node('chat-source', [
    compiler,
    '-p',
    'internal/layered-constructor/contract-provisioning/tsconfig.json',
    '--noEmit',
  ]),
  node(
    'chat-runtime',
    ['node_modules/vitest/vitest.mjs', 'run'],
    join(directory, 'contract-provisioning'),
  ),
  node('inmessage-consumer', [
    'internal/layered-constructor/inmessages/consumer/verify.mjs',
  ]),
  node('inmessage-runtime-controls', [
    'internal/layered-constructor/inmessages/check-runtime-mutations.mjs',
  ]),
  ...[
    ['public-ui', 'ui-leaves'],
    ['public-test-delivery', 'testing-public'],
    ['public-views', 'view-composition'],
    ['shared-namespace', 'block-namespace'],
    ['production-queries', 'query-production'],
    ['active-snippets', 'website-snippets'],
  ].map(([name, path]) =>
    node(name, [`internal/layered-constructor/${path}/verify.mjs`]),
  ),
  node('app-source', [
    'internal/layered-constructor/adoption-checks/verify-apps.mjs',
    'source',
  ]),
  node(
    'website-source',
    [compiler, '-p', 'tsconfig.json', '--noEmit'],
    join(repository, 'packages/website'),
  ),
  node(
    'website-runtime',
    ['node_modules/vitest/vitest.mjs', 'run'],
    join(repository, 'packages/website'),
  ),
  node('compiler-budgets', [
    'packages/foldkit/scripts/check-block-type-performance.ts',
  ]),
  {
    name: 'unchanged-compiler-fixtures',
    command: 'git',
    args: [
      'diff',
      '--exit-code',
      'be0cb38108693068da30eb835e6eb33d6d5762c8',
      '--',
      'packages/foldkit/type-performance',
    ],
    cwd: repository,
  },
]

const selected = process.argv.slice(2)
for (const name of selected) {
  assert.ok(
    checks.some(check => check.name === name),
    `Unknown check: ${name}`,
  )
}
const report = {
  status: 'running',
  scope: selected.length === 0 ? 'all' : 'selected',
  node: process.version,
  budgetHash: originalBudgetHash,
  startedAt: new Date().toISOString(),
  checks: [],
}
const save = () => {
  writeFileSync(
    join(artifacts, 'results.json'),
    JSON.stringify(report, null, 2) + '\n',
  )
  writeFileSync(
    join(verification, 'latest-final.json'),
    JSON.stringify(
      { artifacts, status: report.status, scope: report.scope },
      null,
      2,
    ) + '\n',
  )
}

save()

try {
  const manifest = JSON.parse(readFileSync(join(core, 'package.json'), 'utf8'))
  for (const name of [
    'hybrid',
    'constructed',
    'layered',
    'layered/testing',
    'contracted',
  ]) {
    assert.equal(manifest.exports[`./experimental/${name}`], undefined)
  }

  for (const check of checks) {
    if (selected.length > 0 && !selected.includes(check.name)) {
      continue
    }

    process.stdout.write(`${check.name}: running\n`)
    const started = Date.now()
    const result = spawnSync(check.command, check.args, {
      cwd: check.cwd,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout: 900_000,
    })
    const log = join(artifacts, `${check.name}.log`)
    writeFileSync(log, `${result.stdout ?? ''}${result.stderr ?? ''}`)
    const passed = result.error === undefined && result.status === 0
    report.checks.push({
      name: check.name,
      passed,
      exit: result.status,
      elapsedMs: Date.now() - started,
      log,
    })
    save()
    assert.ok(passed, `${check.name}: see ${log}`)
    process.stdout.write(`${check.name}: passed\n`)
  }

  assert.equal(budgetHash(), originalBudgetHash)
  report.status = 'passed'
} catch (error) {
  report.status = 'failed'
  throw error
} finally {
  report.completedAt = new Date().toISOString()
  save()
}

process.stdout.write(`${artifacts}/results.json\n`)
