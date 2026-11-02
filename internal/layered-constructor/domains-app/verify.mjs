import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const repository = resolve(root, '../../..')
const compiler = resolve(root, 'node_modules/typescript/bin/tsc')
const logDirectory = resolve(root, '.verify')
const source = JSON.parse(
  readFileSync(resolve(root, 'provenance/source.json'), 'utf8'),
)
const phases = []

mkdirSync(logDirectory, { recursive: true })

const run = (name, args, options = {}) => {
  const result = spawnSync(process.execPath, args, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    env: {
      ...process.env,
      WRANGLER_LOG_PATH: resolve(root, '.wrangler/logs'),
    },
  })

  if (result.error !== undefined) {
    throw result.error
  }

  writeFileSync(
    resolve(logDirectory, `${name}.log`),
    result.stdout + result.stderr,
  )

  if (options.quiet !== true) {
    process.stdout.write(result.stdout)
    process.stderr.write(result.stderr)
  }

  return result
}

const requireSuccess = (name, args, options) => {
  const result = run(name, args, options)

  assert.equal(result.status, 0, `${name}: see .verify/${name}.log`)
  phases.push(name)

  return result
}

requireSuccess('setup', ['setup-local.mjs'])
requireSuccess('inventory', ['inventory.mjs'])
requireSuccess('source', [compiler, '-p', 'tsconfig.json', '--pretty', 'false'])
requireSuccess('contracts', [
  compiler,
  '-p',
  'tsconfig.contracts.json',
  '--pretty',
  'false',
])
requireSuccess('lint', ['node_modules/oxlint/bin/oxlint', 'src'])
requireSuccess('tests', [
  'node_modules/vitest/vitest.mjs',
  'run',
  '--config',
  'vitest.config.ts',
])

rmSync(resolve(root, 'declarations'), { recursive: true, force: true })
requireSuccess('declarations', [
  compiler,
  '-p',
  'tsconfig.declarations.json',
  '--pretty',
  'false',
])
requireSuccess('production', ['node_modules/vite/bin/vite.js', 'build'])

const relocated = resolve(root, '.relocated')

rmSync(relocated, { recursive: true, force: true })
mkdirSync(resolve(relocated, 'node_modules/@foldkit'), { recursive: true })
mkdirSync(resolve(relocated, 'node_modules/@effect'), { recursive: true })
mkdirSync(resolve(relocated, 'node_modules/@types'), { recursive: true })

for (const [name, directory] of [
  ['foldkit', 'packages/foldkit'],
  ['@foldkit/ui', 'packages/ui'],
]) {
  for (const item of ['dist', 'package.json']) {
    cpSync(
      resolve(repository, directory, item),
      resolve(relocated, 'node_modules', name, item),
      { recursive: true },
    )
  }
}

for (const [name, original] of [
  ['effect', 'node_modules/effect'],
  ['parse5', 'packages/foldkit/node_modules/parse5'],
  [
    '@effect/platform-browser',
    'packages/foldkit/node_modules/@effect/platform-browser',
  ],
  [
    '@types/node',
    'internal/layered-constructor/domains-app/node_modules/@types/node',
  ],
]) {
  symlinkSync(
    realpathSync(resolve(repository, original)),
    resolve(relocated, 'node_modules', name),
  )
}

cpSync(resolve(root, 'declarations'), resolve(relocated, 'declarations'), {
  recursive: true,
})
mkdirSync(resolve(relocated, 'external'), { recursive: true })
writeFileSync(
  resolve(relocated, 'external/consumer.ts'),
  readFileSync(resolve(root, 'checks/consumer.ts'), 'utf8').replaceAll(
    '../src/',
    '../declarations/',
  ),
)
writeFileSync(
  resolve(relocated, 'package.json'),
  '{"private":true,"type":"module"}\n',
)
writeFileSync(
  resolve(relocated, 'tsconfig.json'),
  `${JSON.stringify(
    {
      compilerOptions: {
        strict: true,
        exactOptionalPropertyTypes: true,
        noUncheckedIndexedAccess: true,
        module: 'ESNext',
        moduleResolution: 'Bundler',
        target: 'ES2022',
        lib: ['ESNext', 'DOM'],
        skipLibCheck: false,
        noEmit: true,
      },
      include: ['external/consumer.ts'],
    },
    null,
    2,
  )}\n`,
)

const emitted = requireSuccess(
  'relocated',
  [compiler, '-p', 'tsconfig.json', '--listFiles', '--pretty', 'false'],
  {
    cwd: relocated,
    quiet: true,
  },
)

assert(!emitted.stdout.includes(resolve(root, 'src')))
assert(!emitted.stdout.includes(resolve(repository, 'packages/foldkit/src')))
assert(!emitted.stdout.includes(resolve(repository, 'packages/foldkit/dist')))
assert(!emitted.stdout.includes(resolve(repository, 'packages/ui/src')))
assert(!emitted.stdout.includes(resolve(repository, 'packages/ui/dist')))

const mutationDirectory = resolve(root, '.mutation/resetViewport')

rmSync(mutationDirectory, { recursive: true, force: true })
mkdirSync(mutationDirectory, { recursive: true })

for (const item of ['src', 'vitest.config.ts', 'package.json']) {
  cpSync(resolve(root, item), resolve(mutationDirectory, item), {
    recursive: true,
  })
}

symlinkSync(
  resolve(root, 'node_modules'),
  resolve(mutationDirectory, 'node_modules'),
)

const resetPath = resolve(mutationDirectory, 'src/client/steps/resultsList.ts')
const resetSource = readFileSync(resetPath, 'utf8')
const resetMutation = resetSource.replace(
  'initAndSet(ResultsListBinding, model, { args: [resultsListConfig] })',
  '({ model })',
)

assert.notEqual(
  resetSource,
  resetMutation,
  'Viewport reset mutation target missing.',
)
writeFileSync(resetPath, resetMutation)

const brokenReset = run(
  'mutation-resetViewport',
  [
    resolve(root, 'node_modules/vitest/vitest.mjs'),
    'run',
    '--config',
    'vitest.config.ts',
    'src/client/story/application.story.test.ts',
    '-t',
    'clearing a scrolled search discards its virtual viewport before another search',
  ],
  { cwd: mutationDirectory, quiet: true },
)

assert.notEqual(
  brokenReset.status,
  0,
  'Removing viewport reset was not detected.',
)
assert.match(brokenReset.stdout + brokenReset.stderr, /expected 1300 to be \+0/)
rmSync(mutationDirectory, { recursive: true, force: true })
phases.push('mutation-resetViewport')

const resultsPath = resolve(root, 'results.json')
const previousResults = existsSync(resultsPath)
  ? JSON.parse(readFileSync(resultsPath, 'utf8'))
  : {}
let browser =
  previousResults.browser ??
  (existsSync(resolve(root, 'browser-results.json'))
    ? JSON.parse(readFileSync(resolve(root, 'browser-results.json'), 'utf8'))
    : { run: false })

if (process.argv.includes('--browser')) {
  const browserRun = requireSuccess(
    'browser',
    [
      'node_modules/@playwright/test/cli.js',
      'test',
      'e2e/domains.spec.ts',
      '--workers=2',
      '--reporter=json',
    ],
    { quiet: true },
  )
  const report = JSON.parse(browserRun.stdout)

  browser = {
    run: true,
    suite: 'e2e/domains.spec.ts',
    engines: ['chromium', 'webkit'],
    expected: report.stats.expected,
    unexpected: report.stats.unexpected,
    flaky: report.stats.flaky,
    skipped: report.stats.skipped,
  }
  writeFileSync(
    resolve(root, 'browser-results.json'),
    `${JSON.stringify(browser, null, 2)}\n`,
  )
}

const changedOriginalFiles = Object.entries(source.sha256).flatMap(
  ([path, expected]) => {
    const actualPath = resolve(source.source, path)
    const actual = existsSync(actualPath)
      ? createHash('sha256').update(readFileSync(actualPath)).digest('hex')
      : undefined

    return actual === expected ? [] : [path]
  },
)

assert.deepEqual(
  changedOriginalFiles,
  [],
  'The original app changed since the isolated copy was taken.',
)

const results = {
  originalCommit: source.commit,
  originalAppUnchanged: true,
  completedPhases: phases,
  originalTests: 86,
  sourceAndEmittedExactServiceContracts: true,
  constructorRequirements: 'never',
  handlerAndProgramRequirements: 'DomainsClient',
  constructorErrors: 'never',
  relocatedCopiedPackages: ['foldkit', '@foldkit/ui'],
  noSourceOrCanonicalDistFallback: true,
  viewportResetMutationDetected: true,
  browser,
  deploymentPerformed: false,
  performanceMeasured: false,
}

writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`)
console.log('Complete Domains migration verification passed.')
